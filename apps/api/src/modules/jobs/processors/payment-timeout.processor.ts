import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  AppointmentStatus,
  AppointmentType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppDispatcher } from '../../whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../../whatsapp/templates';
import { QUEUE_NAMES } from '../queue-tokens';

interface PaymentTimeoutPayload {
  appointmentId: string;
}

@Processor(QUEUE_NAMES.PAYMENT_TIMEOUT)
export class PaymentTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentTimeoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppDispatcher,
  ) {
    super();
  }

  async process(job: Job<PaymentTimeoutPayload>): Promise<void> {
    const { appointmentId } = job.data;
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { timeSlot: true, patient: { select: { whatsappNumber: true } } },
    });
    if (!appointment) {
      this.logger.warn(`payment-timeout: appointment ${appointmentId} not found`);
      return;
    }

    // Idempotent: if already paid/confirmed/cancelled/expired, do nothing.
    if (
      appointment.paymentStatus !== PaymentStatus.PENDING ||
      appointment.status !== AppointmentStatus.PENDING_PAYMENT
    ) {
      this.logger.debug(
        `payment-timeout: ${appointmentId} no-op (status=${appointment.status} payment=${appointment.paymentStatus})`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.EXPIRED },
      });

      if (
        appointment.appointmentType === AppointmentType.TELE_CONSULTATION &&
        appointment.timeSlot
      ) {
        await tx.timeSlot.update({
          where: { id: appointment.timeSlot.id },
          data: { isBooked: false, appointmentId: null },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: null,
          action: 'PAYMENT_TIMEOUT',
          entity: 'Appointment',
          entityId: appointmentId,
          details: {
            previousStatus: appointment.status,
            newStatus: AppointmentStatus.EXPIRED,
            appointmentType: appointment.appointmentType,
            slotReleased:
              appointment.appointmentType === AppointmentType.TELE_CONSULTATION &&
              !!appointment.timeSlot,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    await this.whatsapp.tryTextMessage(
      appointment.patient?.whatsappNumber,
      TEMPLATES.cancelled('Payment timeout — your slot has been released'),
      { appointmentId },
    );

    this.logger.log(`payment-timeout: ${appointmentId} expired`);
  }
}
