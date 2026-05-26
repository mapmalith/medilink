import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  Prisma,
  Role,
} from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppDispatcher } from '../modules/whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../modules/whatsapp/templates';
import { JobSchedulerService } from '../modules/jobs/job-scheduler.service';
import { RescheduleAppointmentDto } from './dto/reschedule.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

const baseInclude = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      whatsappNumber: true,
      nationality: true,
    },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialization: true,
      whatsappNumber: true,
    },
  },
  hotel: {
    select: { id: true, name: true },
  },
} satisfies Prisma.AppointmentInclude;

const RESCHEDULABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ASSIGNED,
];

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppDispatcher,
    private readonly jobs: JobSchedulerService,
  ) {}

  /**
   * Reschedule an appointment. Only Admin and Call Center are permitted (the
   * controller enforces the role guard; this method assumes the caller has
   * already been authorised).
   */
  async reschedule(
    appointmentId: string,
    dto: RescheduleAppointmentDto,
    userId: string,
    userRole: Role,
  ) {
    if (userRole !== Role.ADMIN && userRole !== Role.CALL_CENTER) {
      throw new ForbiddenException(
        'Only Admin and Call Center may reschedule appointments',
      );
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { timeSlot: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // --- Validation ---------------------------------------------------------
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Appointment already completed');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment has been cancelled');
    }
    if (appointment.status === AppointmentStatus.EXPIRED) {
      throw new BadRequestException('Appointment has expired');
    }
    if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot reschedule an appointment in status ${appointment.status}`,
      );
    }

    const maxReschedules = await this.getConfigInt('max_reschedules', 3);
    if (appointment.rescheduleCount >= maxReschedules) {
      throw new BadRequestException(
        `Reschedule max limit reached (${maxReschedules})`,
      );
    }

    const noticeHours = await this.getConfigInt('reschedule_notice_hours', 2);
    const now = new Date();
    const minimumCutoff = new Date(
      appointment.scheduledTime.getTime() - noticeHours * 60 * 60 * 1000,
    );
    if (now > minimumCutoff) {
      throw new BadRequestException(
        `Too close to appointment — reschedules require at least ${noticeHours} hours notice`,
      );
    }

    const newDate = new Date(dto.newDate);
    const newTime = new Date(dto.newTime);
    if (Number.isNaN(newDate.getTime()) || Number.isNaN(newTime.getTime())) {
      throw new BadRequestException('Invalid newDate or newTime');
    }
    if (newTime.getTime() <= now.getTime()) {
      throw new BadRequestException('New appointment time must be in the future');
    }

    // --- Type-specific slot handling ---------------------------------------
    let newDoctorId: string | null = appointment.doctorId;
    let newSlot: Prisma.TimeSlotGetPayload<true> | null = null;

    if (appointment.appointmentType === AppointmentType.TELE_CONSULTATION) {
      if (!dto.newTimeSlotId) {
        throw new BadRequestException(
          'newTimeSlotId is required when rescheduling a tele-consultation',
        );
      }
      newSlot = await this.prisma.timeSlot.findUnique({
        where: { id: dto.newTimeSlotId },
      });
      if (!newSlot) {
        throw new BadRequestException('Selected time slot not found');
      }
      if (newSlot.isBooked) {
        throw new BadRequestException('Selected slot is unavailable');
      }
      if (newSlot.appointmentType !== AppointmentType.TELE_CONSULTATION) {
        throw new BadRequestException(
          'Selected slot is not a tele-consultation slot',
        );
      }
      newDoctorId = newSlot.doctorId;
    } else {
      // House call / Medical visit — allow optional doctor change.
      if (dto.newDoctorId) {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: dto.newDoctorId },
        });
        if (!doctor) {
          throw new BadRequestException('Selected doctor not found');
        }
        newDoctorId = dto.newDoctorId;
      }
    }

    // --- Perform the update in a transaction --------------------------------
    const result = await this.prisma.$transaction(async (tx) => {
      // Release old time slot if any.
      if (appointment.timeSlot) {
        await tx.timeSlot.update({
          where: { id: appointment.timeSlot.id },
          data: { isBooked: false, appointmentId: null },
        });
      }

      // Book the new time slot if provided (tele-consult path).
      if (newSlot) {
        // Re-check inside the transaction to avoid a race.
        const fresh = await tx.timeSlot.findUnique({
          where: { id: newSlot.id },
        });
        if (!fresh || fresh.isBooked) {
          throw new BadRequestException('Selected slot is unavailable');
        }
        await tx.timeSlot.update({
          where: { id: newSlot.id },
          data: { isBooked: true, appointmentId: appointment.id },
        });
      }

      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          scheduledDate: newDate,
          scheduledTime: newTime,
          doctorId: newDoctorId,
          isRescheduled: true,
          rescheduleCount: { increment: 1 },
        },
      });

      await tx.rescheduleLog.create({
        data: {
          appointmentId: appointment.id,
          previousDate: appointment.scheduledDate,
          previousTime: appointment.scheduledTime,
          previousDoctorId: appointment.doctorId,
          newDate,
          newTime,
          newDoctorId,
          reason: dto.reason,
          rescheduledByUserId: userId,
          rescheduledByRole: userRole,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'RESCHEDULE',
          entity: 'Appointment',
          entityId: appointment.id,
          details: {
            previousDate: appointment.scheduledDate.toISOString(),
            previousTime: appointment.scheduledTime.toISOString(),
            previousDoctorId: appointment.doctorId,
            newDate: newDate.toISOString(),
            newTime: newTime.toISOString(),
            newDoctorId,
            reason: dto.reason,
            rescheduleCount: updated.rescheduleCount,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    this.logger.log(
      `Appointment ${appointment.id} rescheduled by ${userId} (${userRole})`,
    );

    await this.jobs.rescheduleJobsForAppointment(
      appointment.id,
      newTime,
      appointment.appointmentType,
    );

    // --- WhatsApp notifications (fire-and-forget) --------------------------
    // Notify patient + new doctor (if assigned). Load the numbers separately
    // so we don't pay for joins in the transaction.
    const [patient, newDoctor] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: result.patientId },
        select: { whatsappNumber: true },
      }),
      newDoctorId
        ? this.prisma.doctor.findUnique({
            where: { id: newDoctorId },
            select: { whatsappNumber: true, firstName: true, lastName: true },
          })
        : Promise.resolve(null),
    ]);

    const oldDateStr = format(appointment.scheduledTime, 'EEE dd MMM HH:mm');
    const newDateStr = format(newTime, 'EEE dd MMM HH:mm');
    const ctx = { appointmentId: appointment.id };

    await Promise.all([
      this.whatsapp.tryTextMessage(
        patient?.whatsappNumber,
        TEMPLATES.rescheduled(oldDateStr, newDateStr, dto.reason),
        ctx,
      ),
      this.whatsapp.tryTextMessage(
        newDoctor?.whatsappNumber,
        TEMPLATES.rescheduled(oldDateStr, newDateStr, dto.reason),
        ctx,
      ),
    ]);

    return {
      ...result,
      amountCharged: result.amountCharged?.toNumber() ?? null,
    };
  }

  async getRescheduleHistory(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const logs = await this.prisma.rescheduleLog.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });

    // Resolve user + doctor names for a friendlier UI.
    const userIds = Array.from(new Set(logs.map((l) => l.rescheduledByUserId)));
    const doctorIds = Array.from(
      new Set(
        logs
          .flatMap((l) => [l.previousDoctorId, l.newDoctorId])
          .filter((v): v is string => !!v),
      ),
    );

    const [users, doctors] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : Promise.resolve([]),
      doctorIds.length
        ? this.prisma.doctor.findMany({
            where: { id: { in: doctorIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));

    return logs.map((log) => ({
      ...log,
      rescheduledBy: userMap.get(log.rescheduledByUserId) ?? null,
      previousDoctor: log.previousDoctorId
        ? doctorMap.get(log.previousDoctorId) ?? null
        : null,
      newDoctor: log.newDoctorId
        ? doctorMap.get(log.newDoctorId) ?? null
        : null,
    }));
  }

  /**
   * List available (un-booked) tele-consultation time slots for a given date.
   * Used by the reschedule modal when rescheduling a tele-consult appointment.
   */
  async getAvailableSlots(
    appointmentId: string,
    date: string,
    doctorId?: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { appointmentType: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    // Normalise to date-only (midnight UTC) to match Prisma @db.Date.
    const dateOnly = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
    );

    const where: Prisma.TimeSlotWhereInput = {
      date: dateOnly,
      isBooked: false,
      appointmentType: appointment.appointmentType,
    };
    if (doctorId) {
      where.doctorId = doctorId;
    }

    const slots = await this.prisma.timeSlot.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, firstName: true, lastName: true, specialization: true },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    return slots;
  }

  /**
   * List available (un-booked) time slots for a given date and type. Used by
   * the booking wizard to display the slot grid for tele-consultation.
   */
  async listAvailableSlots(
    date: string,
    appointmentType: AppointmentType,
    doctorId?: string,
  ) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const dateOnly = new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );

    const where: Prisma.TimeSlotWhereInput = {
      date: dateOnly,
      isBooked: false,
      appointmentType,
    };
    if (doctorId) {
      where.doctorId = doctorId;
    }

    return this.prisma.timeSlot.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });
  }

  /**
   * Create a new appointment. The caller's role determines `bookedBy`. For
   * HOTEL callers the hotel id is forced to the caller's hotel; ADMIN /
   * CALL_CENTER may optionally pass `hotelId` in the dto.
   */
  async createAppointment(
    dto: CreateAppointmentDto,
    userId: string,
    userRole: Role,
  ) {
    // --- Resolve hotel ------------------------------------------------------
    let hotelId: string | null = null;
    if (userRole === Role.HOTEL) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { userId },
      });
      if (!hotel) {
        throw new ForbiddenException('No hotel profile linked to this user');
      }
      hotelId = hotel.id;
    } else if (dto.hotelId) {
      hotelId = dto.hotelId;
    }

    // --- Validate patient ---------------------------------------------------
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // --- Resolve type-specific fields --------------------------------------
    let scheduledDate: Date;
    let scheduledTime: Date;
    let doctorId: string | null = dto.doctorId ?? null;
    let timeSlot: Prisma.TimeSlotGetPayload<true> | null = null;

    if (dto.appointmentType === AppointmentType.TELE_CONSULTATION) {
      if (!dto.timeSlotId) {
        throw new BadRequestException(
          'timeSlotId is required for tele-consultation bookings',
        );
      }
      timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id: dto.timeSlotId },
      });
      if (!timeSlot) {
        throw new BadRequestException('Selected time slot not found');
      }
      if (timeSlot.isBooked) {
        throw new BadRequestException('Selected slot is unavailable');
      }
      if (timeSlot.appointmentType !== AppointmentType.TELE_CONSULTATION) {
        throw new BadRequestException(
          'Selected slot is not a tele-consultation slot',
        );
      }
      doctorId = timeSlot.doctorId;
      scheduledDate = timeSlot.date;
      scheduledTime = timeSlot.startTime;
    } else {
      if (!dto.scheduledDate || !dto.scheduledTime) {
        throw new BadRequestException(
          'scheduledDate and scheduledTime are required',
        );
      }
      scheduledDate = new Date(dto.scheduledDate);
      scheduledTime = new Date(dto.scheduledTime);
      if (
        Number.isNaN(scheduledDate.getTime()) ||
        Number.isNaN(scheduledTime.getTime())
      ) {
        throw new BadRequestException('Invalid scheduledDate or scheduledTime');
      }
      if (scheduledTime.getTime() <= Date.now()) {
        throw new BadRequestException('Appointment time must be in the future');
      }
      if (doctorId) {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: doctorId },
        });
        if (!doctor) {
          throw new BadRequestException('Selected doctor not found');
        }
      }
    }

    // --- Lookup pricing -----------------------------------------------------
    const pricing = await this.prisma.appointmentPricing.findFirst({
      where: { appointmentType: dto.appointmentType, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    const amountCharged = pricing?.price ?? null;
    const currency = pricing?.currency ?? 'USD';

    // --- Resolve bookedBy + createdByStaffId -------------------------------
    // For CALL_CENTER, the actual staff user is recorded in createdByStaffId
    // and `bookedBy` reflects the caller-type the staff member selected
    // (HOTEL when calling on behalf of a hotel, PATIENT for direct patient
    // calls). For all other roles, `bookedBy` is the caller's own role.
    let bookedBy: Role = userRole;
    let createdByStaffId: string | null = null;
    if (userRole === Role.CALL_CENTER) {
      createdByStaffId = userId;
      if (dto.bookedBy === Role.HOTEL || dto.bookedBy === Role.PATIENT) {
        bookedBy = dto.bookedBy;
      }
    }

    // --- Persist ------------------------------------------------------------
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          appointmentType: dto.appointmentType,
          status: AppointmentStatus.PENDING_PAYMENT,
          patientId: dto.patientId,
          doctorId,
          hotelId,
          bookedBy,
          createdByStaffId,
          scheduledDate,
          scheduledTime,
          duration: dto.duration ?? 30,
          visitAddress: dto.visitAddress,
          notes: dto.notes,
          amountCharged,
          currency,
        },
        include: baseInclude,
      });

      if (timeSlot) {
        // Re-check inside transaction to avoid race
        const fresh = await tx.timeSlot.findUnique({
          where: { id: timeSlot.id },
        });
        if (!fresh || fresh.isBooked) {
          throw new BadRequestException('Selected slot is unavailable');
        }
        await tx.timeSlot.update({
          where: { id: timeSlot.id },
          data: { isBooked: true, appointmentId: created.id },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Appointment',
          entityId: created.id,
          details: {
            appointmentType: dto.appointmentType,
            patientId: dto.patientId,
            hotelId,
            doctorId,
            bookedBy,
            createdByStaffId,
            amountCharged: amountCharged?.toNumber() ?? null,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return created;
    });

    await this.jobs.schedulePaymentTimeout(result.id);

    return {
      ...result,
      amountCharged: result.amountCharged?.toNumber() ?? null,
    };
  }

  /**
   * Cross-hotel appointment search for the call-center reschedule page.
   * Matches against appointment id (prefix), patient name, patient WhatsApp
   * number, and hotel name. Returns the 20 most recent hits.
   */
  async search(q: string) {
    const term = q.trim();
    if (!term) return [];

    const where: Prisma.AppointmentWhereInput = {
      OR: [
        { id: { startsWith: term, mode: 'insensitive' } },
        { patient: { firstName: { contains: term, mode: 'insensitive' } } },
        { patient: { lastName: { contains: term, mode: 'insensitive' } } },
        {
          patient: { whatsappNumber: { contains: term, mode: 'insensitive' } },
        },
        { hotel: { name: { contains: term, mode: 'insensitive' } } },
      ],
    };

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: baseInclude,
      orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
      take: 20,
    });

    return appointments.map((a) => ({
      ...a,
      amountCharged: a.amountCharged?.toNumber() ?? null,
    }));
  }

  /**
   * Lightweight stats for the call-center dashboard. Currently only the
   * `today` scope is supported: counts of bookings created today, pending
   * payments today, and rescheduled today.
   */
  async getStats(scope: string) {
    if (scope !== 'today') {
      throw new BadRequestException(`Unsupported stats scope: ${scope}`);
    }

    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const [todayBookings, pendingPayments, rescheduledToday] =
      await Promise.all([
        this.prisma.appointment.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        this.prisma.appointment.count({
          where: {
            status: AppointmentStatus.PENDING_PAYMENT,
            scheduledDate: { gte: start, lt: end },
          },
        }),
        this.prisma.rescheduleLog.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
      ]);

    return { scope, todayBookings, pendingPayments, rescheduledToday };
  }

  private async getConfigInt(key: string, fallback: number): Promise<number> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!row) return fallback;
    const parsed = parseInt(row.value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
