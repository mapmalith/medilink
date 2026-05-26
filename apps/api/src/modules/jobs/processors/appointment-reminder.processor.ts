import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppointmentStatus } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppDispatcher } from '../../whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../../whatsapp/templates';
import { QUEUE_NAMES } from '../queue-tokens';

interface ReminderPayload {
  appointmentId: string;
}

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ASSIGNED,
];

@Processor(QUEUE_NAMES.APPOINTMENT_REMINDER)
export class AppointmentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppDispatcher,
  ) {
    super();
  }

  async process(job: Job<ReminderPayload>): Promise<void> {
    const { appointmentId } = job.data;
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { whatsappNumber: true } },
        doctor: { select: { whatsappNumber: true } },
      },
    });
    if (!appointment) {
      this.logger.warn(`reminder: appointment ${appointmentId} not found`);
      return;
    }
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      this.logger.debug(
        `reminder: skip ${appointmentId} (status=${appointment.status})`,
      );
      return;
    }

    const dateStr = format(appointment.scheduledTime, 'EEE dd MMM');
    const timeStr = format(appointment.scheduledTime, 'HH:mm');
    const body = TEMPLATES.reminder2hr(dateStr, timeStr);
    const ctx = { appointmentId };

    await Promise.all([
      this.whatsapp.tryTextMessage(appointment.patient?.whatsappNumber, body, ctx),
      this.whatsapp.tryTextMessage(appointment.doctor?.whatsappNumber, body, ctx),
    ]);

    this.logger.log(`reminder sent for ${appointmentId}`);
  }
}
