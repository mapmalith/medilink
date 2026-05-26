import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppDispatcher } from '../modules/whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../modules/whatsapp/templates';
import { JobSchedulerService } from '../modules/jobs/job-scheduler.service';
import type { DoctorAvailabilitySlotDto } from './dto/availability.dto';
import type { CompleteConsultationDto } from './dto/complete-consultation.dto';

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
  hotel: {
    select: { id: true, name: true },
  },
  medicalRecord: {
    select: { id: true },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof baseInclude;
}>;

function serialize(appt: AppointmentWithRelations) {
  return {
    ...appt,
    amountCharged: appt.amountCharged?.toNumber() ?? null,
  };
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

@Injectable()
export class DoctorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppDispatcher,
    private readonly jobs: JobSchedulerService,
  ) {}

  /**
   * Resolve the Doctor row from a User id (as returned by the JWT).
   */
  async getDoctorForUser(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, phone: true, isActive: true } },
      },
    });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this user');
    }
    return doctor;
  }

  async listAppointments(
    userId: string,
    filters: { startDate?: string; endDate?: string; status?: AppointmentStatus },
  ) {
    const doctor = await this.getDoctorForUser(userId);

    const where: Prisma.AppointmentWhereInput = { doctorId: doctor.id };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) {
        where.scheduledDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.scheduledDate.lte = new Date(filters.endDate);
      }
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: baseInclude,
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });

    return appointments.map(serialize);
  }

  async getAppointment(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorForUser(userId);
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: baseInclude,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException(
        'You are not assigned to this appointment',
      );
    }
    return serialize(appointment);
  }

  async listToday(userId: string) {
    const doctor = await this.getDoctorForUser(userId);
    const today = startOfUtcDay(new Date());
    const tomorrow = addDays(today, 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledDate: { gte: today, lt: tomorrow },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.EXPIRED] },
      },
      include: baseInclude,
      orderBy: [{ scheduledTime: 'asc' }],
    });

    return appointments.map(serialize);
  }

  async getStats(userId: string) {
    const doctor = await this.getDoctorForUser(userId);
    const now = new Date();
    const today = startOfUtcDay(now);
    const tomorrow = addDays(today, 1);

    // Week starts Monday in UTC.
    const dayOfWeek = (today.getUTCDay() + 6) % 7; // 0 = Mon
    const weekStart = addDays(today, -dayOfWeek);
    const weekEnd = addDays(weekStart, 7);

    const activeStatuses: AppointmentStatus[] = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.ASSIGNED,
      AppointmentStatus.IN_PROGRESS,
    ];

    const [todayCount, weeklyCount, completedToday, nextAppointment] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            scheduledDate: { gte: today, lt: tomorrow },
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.EXPIRED] },
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            scheduledDate: { gte: weekStart, lt: weekEnd },
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.EXPIRED] },
          },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            scheduledDate: { gte: today, lt: tomorrow },
            status: AppointmentStatus.COMPLETED,
          },
        }),
        this.prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            scheduledTime: { gte: now },
            status: { in: activeStatuses },
          },
          include: baseInclude,
          orderBy: [{ scheduledTime: 'asc' }],
        }),
      ]);

    return {
      todayCount,
      weeklyCount,
      completedToday,
      nextAppointment: nextAppointment ? serialize(nextAppointment) : null,
    };
  }

  async startConsultation(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorForUser(userId);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException(
        'You are not assigned to this appointment',
      );
    }
    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        `Cannot start a consultation in status ${appointment.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.IN_PROGRESS },
        include: baseInclude,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'START_CONSULTATION',
          entity: 'Appointment',
          entityId: appointmentId,
          details: {
            previousStatus: appointment.status,
            newStatus: AppointmentStatus.IN_PROGRESS,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return serialize(updated);
    });
  }

  async getMe(userId: string) {
    return this.getDoctorForUser(userId);
  }

  async completeConsultation(
    userId: string,
    appointmentId: string,
    dto: CompleteConsultationDto,
  ) {
    const doctor = await this.getDoctorForUser(userId);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { medicalRecord: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException(
        'You are not assigned to this appointment',
      );
    }
    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete a consultation in status ${appointment.status}. Start the consultation first.`,
      );
    }
    if (appointment.medicalRecord) {
      throw new BadRequestException(
        'A medical record already exists for this appointment',
      );
    }
    if (dto.followUpRequired && !dto.followUpDate) {
      throw new BadRequestException(
        'Follow-up date is required when follow-up is enabled',
      );
    }

    // Validate every prescribed drug exists and is active.
    if (dto.prescriptions.length > 0) {
      const drugIds = dto.prescriptions.map((p) => p.drugId);
      const drugs = await this.prisma.drug.findMany({
        where: { id: { in: drugIds }, isActive: true },
        select: { id: true },
      });
      const foundIds = new Set(drugs.map((d) => d.id));
      const missing = drugIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Unknown or inactive drug(s): ${missing.join(', ')}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const medicalRecord = await tx.medicalRecord.create({
        data: {
          appointmentId,
          patientId: appointment.patientId,
          doctorId: doctor.id,
          diagnosis: dto.diagnosis ?? null,
          notes: dto.notes ?? null,
          followUpRequired: dto.followUpRequired,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
          followUpNotes: dto.followUpNotes ?? null,
        },
      });

      if (dto.prescriptions.length > 0) {
        await tx.prescription.createMany({
          data: dto.prescriptions.map((p) => ({
            medicalRecordId: medicalRecord.id,
            drugId: p.drugId,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            instructions: p.instructions ?? null,
          })),
        });
      }

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
        include: baseInclude,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'COMPLETE_CONSULTATION',
          entity: 'Appointment',
          entityId: appointmentId,
          details: {
            previousStatus: appointment.status,
            newStatus: AppointmentStatus.COMPLETED,
            medicalRecordId: medicalRecord.id,
            prescriptionCount: dto.prescriptions.length,
            followUpRequired: dto.followUpRequired,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return {
        appointment: updated,
        medicalRecordId: medicalRecord.id,
      };
    });

    // Notify the patient that their consultation summary is ready. Use the
    // public medical-record URL (stable, fixed pattern). The page itself may
    // not exist yet — that's fine; the URL is a permalink for future use.
    const baseUrl = this.config.get<string>(
      'MEDILINK_BASE_URL',
      'https://medilink.lk',
    );
    const recordUrl = `${baseUrl}/medical-records/${result.medicalRecordId}`;
    await this.whatsapp.tryTextMessage(
      result.appointment.patient.whatsappNumber,
      TEMPLATES.diagnosisReady(recordUrl),
      { appointmentId: appointmentId },
    );

    await this.jobs.scheduleInvoiceGeneration(appointmentId);

    return {
      appointment: serialize(result.appointment),
      medicalRecordId: result.medicalRecordId,
    };
  }

  async getAvailability(userId: string) {
    const doctor = await this.getDoctorForUser(userId);
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async replaceAvailability(
    userId: string,
    slots: DoctorAvailabilitySlotDto[],
  ) {
    const doctor = await this.getDoctorForUser(userId);

    // Validate each slot's start < end
    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          `Slot start time must be before end time (day ${slot.dayOfWeek}, ${slot.startTime}-${slot.endTime})`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({
        where: { doctorId: doctor.id },
      });

      if (slots.length > 0) {
        await tx.doctorAvailability.createMany({
          data: slots.map((slot) => ({
            doctorId: doctor.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            appointmentType: slot.appointmentType,
            isActive: slot.isActive,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'DoctorAvailability',
          entityId: doctor.id,
          details: {
            slotsCount: slots.length,
            source: 'doctor-portal',
          } satisfies Prisma.InputJsonValue,
        },
      });

      return tx.doctorAvailability.findMany({
        where: { doctorId: doctor.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async deleteAvailabilitySlot(userId: string, slotId: string) {
    const doctor = await this.getDoctorForUser(userId);

    const slot = await this.prisma.doctorAvailability.findUnique({
      where: { id: slotId },
    });
    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }
    if (slot.doctorId !== doctor.id) {
      throw new ForbiddenException('You do not own this availability slot');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.delete({ where: { id: slotId } });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          entity: 'DoctorAvailability',
          entityId: slotId,
          details: {
            doctorId: doctor.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            appointmentType: slot.appointmentType,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    return { success: true };
  }
}
