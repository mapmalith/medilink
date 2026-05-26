import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecordConsentDto } from './dto/gdpr.dto';

const REDACTED = 'REDACTED';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordConsent(
    patientId: string,
    dto: RecordConsentDto,
    userId: string,
    userRole: Role,
    ip: string | null,
    userAgent: string | null,
  ) {
    await this.assertCanAccessPatient(patientId, userId, userRole);
    const consent = await this.prisma.patientConsent.create({
      data: {
        patientId,
        consentType: dto.consentType,
        consentText: dto.consentText,
        ipAddress: ip,
        userAgent,
      },
    });
    return consent;
  }

  async listConsents(patientId: string, userId: string, userRole: Role) {
    await this.assertCanAccessPatient(patientId, userId, userRole);
    return this.prisma.patientConsent.findMany({
      where: { patientId },
      orderBy: { givenAt: 'desc' },
    });
  }

  async exportData(patientId: string, userId: string, userRole: Role) {
    await this.assertCanAccessPatient(patientId, userId, userRole);
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { id: true, email: true, phone: true, createdAt: true } },
        hotel: { select: { id: true, name: true } },
        appointments: {
          include: {
            payments: true,
            invoice: true,
            rescheduleLogs: true,
          },
          orderBy: { scheduledTime: 'desc' },
        },
        medicalRecords: {
          include: {
            prescriptions: {
              include: { drug: { select: { id: true, name: true } } },
            },
            documents: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        consents: { orderBy: { givenAt: 'desc' } },
      },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return {
      generatedAt: new Date().toISOString(),
      patient,
    };
  }

  async eraseData(
    patientId: string,
    userId: string,
    confirm: boolean,
    ip: string | null,
  ) {
    if (!confirm) {
      throw new BadRequestException(
        'Confirmation required. Pass ?confirm=true to acknowledge irreversible erasure.',
      );
    }
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: { medicalRecords: { select: { id: true } } },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patientId },
        data: {
          firstName: REDACTED,
          lastName: REDACTED,
          passportNumber: null,
          whatsappNumber: null,
          emailAddress: null,
          dateOfBirth: null,
          nationality: null,
          isAnonymized: true,
          anonymizedAt: new Date(),
        },
      });

      if (patient.medicalRecords.length > 0) {
        await tx.medicalRecord.updateMany({
          where: { patientId },
          data: {
            diagnosis: REDACTED,
            notes: REDACTED,
            followUpNotes: null,
          },
        });
      }

      await tx.patientConsent.updateMany({
        where: { patientId, isWithdrawn: false },
        data: { isWithdrawn: true, withdrawnAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'GDPR_ERASURE',
          entity: 'Patient',
          entityId: patientId,
          details: {
            medicalRecordsRedacted: patient.medicalRecords.length,
          } satisfies Prisma.InputJsonValue,
          ipAddress: ip,
        },
      });

      return { patientId, medicalRecordsRedacted: patient.medicalRecords.length };
    });

    this.logger.warn(
      `GDPR erasure executed for patient ${patientId} by user ${userId}`,
    );
    return { success: true, ...result };
  }

  /**
   * ADMIN/CALL_CENTER → any patient. HOTEL → patients linked to that hotel.
   * PATIENT → only their own record.
   */
  private async assertCanAccessPatient(
    patientId: string,
    userId: string,
    userRole: Role,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, userId: true, hotelId: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    if (userRole === Role.ADMIN || userRole === Role.CALL_CENTER) return;
    if (userRole === Role.PATIENT) {
      if (patient.userId !== userId) {
        throw new ForbiddenException('You may only access your own record');
      }
      return;
    }
    if (userRole === Role.HOTEL) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!hotel || hotel.id !== patient.hotelId) {
        throw new ForbiddenException(
          'You may only access patients linked to your hotel',
        );
      }
      return;
    }
    throw new ForbiddenException('Not permitted');
  }
}
