import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  Prisma,
} from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppDispatcher } from '../modules/whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../modules/whatsapp/templates';
import { JobSchedulerService } from '../modules/jobs/job-scheduler.service';
import type {
  AppointmentStatusValue,
  AppointmentTypeValue,
} from './dto/appointment.dto';

type ListFilters = {
  type?: AppointmentTypeValue;
  status?: AppointmentStatusValue;
  hotelId?: string;
  doctorId?: string;
  startDate?: string;
  endDate?: string;
};

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
    select: {
      id: true,
      name: true,
    },
  },
  rescheduledFrom: {
    select: {
      id: true,
      scheduledDate: true,
      scheduledTime: true,
    },
  },
  rescheduledTo: {
    select: {
      id: true,
      scheduledDate: true,
      scheduledTime: true,
    },
  },
  medicalRecord: {
    select: {
      id: true,
    },
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

@Injectable()
export class AdminAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppDispatcher,
    private readonly jobs: JobSchedulerService,
  ) {}

  async findAll(filters: ListFilters) {
    const where: Prisma.AppointmentWhereInput = {};

    if (filters.type) {
      where.appointmentType = filters.type as AppointmentType;
    }
    if (filters.status) {
      where.status = filters.status as AppointmentStatus;
    }
    if (filters.hotelId) {
      where.hotelId = filters.hotelId;
    }
    if (filters.doctorId) {
      where.doctorId = filters.doctorId;
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
      orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
    });

    return appointments.map(serialize);
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        ...baseInclude,
        rescheduleLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return {
      ...appointment,
      amountCharged: appointment.amountCharged?.toNumber() ?? null,
    };
  }

  async updateStatus(
    id: string,
    dto: { status: AppointmentStatusValue; cancellationReason?: string },
    userId: string,
  ) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }

    const nextStatus = dto.status as AppointmentStatus;

    if (
      nextStatus === AppointmentStatus.ASSIGNED &&
      !existing.doctorId
    ) {
      throw new BadRequestException(
        'Cannot mark as ASSIGNED without a doctor. Use assign-doctor endpoint first.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.AppointmentUpdateInput = { status: nextStatus };
      if (
        nextStatus === AppointmentStatus.CANCELLED &&
        dto.cancellationReason
      ) {
        data.cancellationReason = dto.cancellationReason;
      }

      const row = await tx.appointment.update({
        where: { id },
        data,
        include: baseInclude,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'Appointment',
          entityId: id,
          details: {
            field: 'status',
            previousValue: existing.status,
            newValue: nextStatus,
            cancellationReason: dto.cancellationReason ?? null,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return row;
    });

    // Fire WhatsApp notification when the new status is CANCELLED.
    if (nextStatus === AppointmentStatus.CANCELLED) {
      await this.whatsapp.tryTextMessage(
        updated.patient.whatsappNumber,
        TEMPLATES.cancelled(
          dto.cancellationReason ?? 'No reason provided',
        ),
        { appointmentId: id },
      );
      await this.jobs.cancelJobsForAppointment(id);
    }

    return serialize(updated);
  }

  async assignDoctor(id: string, doctorId: string, userId: string) {
    const [existing, doctor] = await Promise.all([
      this.prisma.appointment.findUnique({ where: { id } }),
      this.prisma.doctor.findUnique({ where: { id: doctorId } }),
    ]);

    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.appointment.update({
        where: { id },
        data: {
          doctorId,
          status: AppointmentStatus.ASSIGNED,
        },
        include: baseInclude,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'Appointment',
          entityId: id,
          details: {
            field: 'doctorId',
            previousDoctorId: existing.doctorId,
            newDoctorId: doctorId,
            previousStatus: existing.status,
            newStatus: AppointmentStatus.ASSIGNED,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return row;
    });

    // Notify the newly assigned doctor of the incoming appointment.
    const patientName = `${updated.patient.firstName} ${updated.patient.lastName}`;
    const dateStr = format(updated.scheduledDate, 'dd/MM/yyyy');
    const timeStr = format(updated.scheduledTime, 'HH:mm');
    await this.whatsapp.tryTextMessage(
      updated.doctor?.whatsappNumber,
      TEMPLATES.doctorAssigned(
        patientName,
        dateStr,
        timeStr,
        updated.visitAddress ?? 'MEDI LINK facility',
      ),
      { appointmentId: id },
    );

    return serialize(updated);
  }
}
