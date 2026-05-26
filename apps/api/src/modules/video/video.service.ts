import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_DAILY_API_URL = 'https://api.daily.co/v1';

interface DailyRoomResponse {
  id: string;
  name: string;
  url: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create a Daily.co room for the given appointment and persist the URL +
   * id on the Appointment record. Idempotent: returns the existing URL if
   * the room was already created.
   */
  async createRoom(appointmentId: string): Promise<{ roomUrl: string }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.appointmentType !== AppointmentType.TELE_CONSULTATION) {
      throw new BadRequestException(
        'Only tele-consultations have video rooms',
      );
    }

    if (appointment.videoRoomUrl) {
      return { roomUrl: appointment.videoRoomUrl };
    }

    const apiUrl = this.config.get<string>(
      'DAILY_API_URL',
      DEFAULT_DAILY_API_URL,
    );
    const apiKey = this.config.get<string>('DAILY_API_KEY', '');
    if (!apiKey) {
      throw new BadRequestException(
        'DAILY_API_KEY is not configured on the server',
      );
    }

    // Room expires 2 hours after scheduled start.
    const exp = Math.floor(
      (appointment.scheduledTime.getTime() + 2 * 60 * 60 * 1000) / 1000,
    );
    const roomName = `medilink-${appointment.id.slice(0, 12)}`;

    const response = await fetch(`${apiUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp,
          enable_chat: true,
          enable_knocking: true,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(
        `Daily.co createRoom failed (${response.status}): ${text}`,
      );
      throw new BadRequestException(
        `Daily.co room creation failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as DailyRoomResponse;

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        videoRoomUrl: data.url,
        videoRoomId: data.id,
      },
    });

    this.logger.log(
      `Created Daily.co room ${data.name} for appointment ${appointment.id}`,
    );
    return { roomUrl: data.url };
  }

  /**
   * Return the room URL for the given appointment, validating the caller
   * is allowed to join (the patient, the assigned doctor, an admin, or
   * call-center staff). Lazily creates the room if it doesn't exist yet
   * and the appointment start is within 10 minutes.
   */
  async getRoomForJoin(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.appointmentType !== AppointmentType.TELE_CONSULTATION) {
      throw new BadRequestException(
        'Only tele-consultations have video rooms',
      );
    }

    // Authorisation: admin / call-center get through; otherwise caller must
    // be the patient or the assigned doctor on this appointment.
    if (userRole !== Role.ADMIN && userRole !== Role.CALL_CENTER) {
      const isPatient = appointment.patient.userId === userId;
      const isDoctor = appointment.doctor?.userId === userId;
      if (!isPatient && !isDoctor) {
        throw new ForbiddenException(
          'You are not a participant in this consultation',
        );
      }
    }

    // Lazy-create the room when we're within 10 minutes of the start.
    const tenMinBefore =
      appointment.scheduledTime.getTime() - 10 * 60 * 1000;
    const notYetOpen = Date.now() < tenMinBefore;
    let roomUrl = appointment.videoRoomUrl;
    if (!roomUrl && !notYetOpen) {
      const created = await this.createRoom(appointment.id);
      roomUrl = created.roomUrl;
    }

    return {
      roomUrl,
      notYetOpen,
      appointment: {
        id: appointment.id,
        status: appointment.status,
        appointmentType: appointment.appointmentType,
        scheduledDate: appointment.scheduledDate,
        scheduledTime: appointment.scheduledTime,
        patient: {
          id: appointment.patient.id,
          firstName: appointment.patient.firstName,
          lastName: appointment.patient.lastName,
        },
        doctor: appointment.doctor
          ? {
              id: appointment.doctor.id,
              firstName: appointment.doctor.firstName,
              lastName: appointment.doctor.lastName,
            }
          : null,
      },
    };
  }

  /**
   * Delete a Daily.co room (used after the call ends to free up the slot).
   * Silent-fail on 404 so re-calling this for an already-deleted room is
   * safe.
   */
  async deleteRoom(roomName: string): Promise<void> {
    const apiUrl = this.config.get<string>(
      'DAILY_API_URL',
      DEFAULT_DAILY_API_URL,
    );
    const apiKey = this.config.get<string>('DAILY_API_KEY', '');
    if (!apiKey) return;

    const response = await fetch(`${apiUrl}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      this.logger.warn(
        `Daily.co deleteRoom(${roomName}) failed (${response.status}): ${text}`,
      );
    }
  }
}
