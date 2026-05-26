import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { VideoService } from '../../video/video.service';
import { WhatsAppDispatcher } from '../../whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../../whatsapp/templates';
import { QUEUE_NAMES } from '../queue-tokens';

interface VideoRoomPayload {
  appointmentId: string;
}

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ASSIGNED,
];

@Processor(QUEUE_NAMES.VIDEO_ROOM_CREATION)
export class VideoRoomCreationProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoRoomCreationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly video: VideoService,
    private readonly whatsapp: WhatsAppDispatcher,
  ) {
    super();
  }

  async process(job: Job<VideoRoomPayload>): Promise<void> {
    const { appointmentId } = job.data;
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { whatsappNumber: true } },
        doctor: { select: { whatsappNumber: true } },
      },
    });
    if (!appointment) {
      this.logger.warn(`video-room: appointment ${appointmentId} not found`);
      return;
    }
    if (appointment.appointmentType !== AppointmentType.TELE_CONSULTATION) {
      this.logger.debug(
        `video-room: skip ${appointmentId} (type=${appointment.appointmentType})`,
      );
      return;
    }
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      this.logger.debug(
        `video-room: skip ${appointmentId} (status=${appointment.status})`,
      );
      return;
    }

    const { roomUrl } = await this.video.createRoom(appointmentId);

    const body = TEMPLATES.videoJoinLink(roomUrl);
    const ctx = { appointmentId };
    await Promise.all([
      this.whatsapp.tryTextMessage(appointment.patient?.whatsappNumber, body, ctx),
      this.whatsapp.tryTextMessage(appointment.doctor?.whatsappNumber, body, ctx),
    ]);

    this.logger.log(`video-room: created + notified for ${appointmentId}`);
  }
}
