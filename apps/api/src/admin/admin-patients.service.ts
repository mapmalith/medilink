import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminPatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll() {
    const patients = await this.prisma.patient.findMany({
      include: {
        user: {
          select: { email: true, phone: true, isActive: true },
        },
        hotel: {
          select: { id: true, name: true },
        },
        _count: {
          select: { appointments: true },
        },
        appointments: {
          select: { scheduledDate: true },
          orderBy: { scheduledDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((patient) => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      nationality: patient.nationality,
      passportNumber: patient.passportNumber,
      whatsappNumber: patient.whatsappNumber,
      emailAddress: patient.emailAddress,
      dateOfBirth: patient.dateOfBirth,
      user: patient.user,
      hotel: patient.hotel,
      appointmentsCount: patient._count.appointments,
      lastVisit: patient.appointments[0]?.scheduledDate ?? null,
      createdAt: patient.createdAt,
    }));
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true, phone: true, isActive: true },
        },
        hotel: {
          select: { id: true, name: true },
        },
        medicalRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: {
              select: { firstName: true, lastName: true, specialization: true },
            },
            appointment: {
              select: {
                id: true,
                appointmentType: true,
                scheduledDate: true,
              },
            },
          },
        },
        consents: {
          orderBy: { givenAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  async create(
    dto: {
      email: string;
      password: string;
      phone?: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      nationality?: string;
      passportNumber?: string;
      whatsappNumber?: string;
      hotelId?: string;
    },
    userId: string,
  ) {
    const passwordHash = await this.authService.hashPassword(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: Role.PATIENT,
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          nationality: dto.nationality,
          passportNumber: dto.passportNumber,
          whatsappNumber: dto.whatsappNumber,
          emailAddress: dto.email,
          hotelId: dto.hotelId,
        },
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
          },
          hotel: {
            select: { id: true, name: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Patient',
          entityId: patient.id,
          details: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return patient;
    });
  }

  async update(
    id: string,
    dto: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      nationality?: string;
      passportNumber?: string;
      whatsappNumber?: string;
      hotelId?: string;
      isActive?: boolean;
    },
    userId: string,
  ) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = {};
      if (dto.email !== undefined) userUpdate.email = dto.email;
      if (dto.phone !== undefined) userUpdate.phone = dto.phone;
      if (dto.isActive !== undefined) userUpdate.isActive = dto.isActive;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdate,
        });
      }

      const patientUpdate: Record<string, unknown> = {};
      if (dto.firstName !== undefined) patientUpdate.firstName = dto.firstName;
      if (dto.lastName !== undefined) patientUpdate.lastName = dto.lastName;
      if (dto.dateOfBirth !== undefined)
        patientUpdate.dateOfBirth = new Date(dto.dateOfBirth);
      if (dto.nationality !== undefined)
        patientUpdate.nationality = dto.nationality;
      if (dto.passportNumber !== undefined)
        patientUpdate.passportNumber = dto.passportNumber;
      if (dto.whatsappNumber !== undefined)
        patientUpdate.whatsappNumber = dto.whatsappNumber;
      if (dto.hotelId !== undefined) patientUpdate.hotelId = dto.hotelId;
      if (dto.email !== undefined) patientUpdate.emailAddress = dto.email;

      const patient = await tx.patient.update({
        where: { id },
        data: patientUpdate,
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
          },
          hotel: {
            select: { id: true, name: true },
          },
        },
      });

      const logDetails: Record<string, string | boolean | null> = {};
      for (const [key, val] of Object.entries(dto)) {
        if (val !== undefined) {
          logDetails[key] = val as string | boolean | null;
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'Patient',
          entityId: id,
          details: logDetails satisfies Prisma.InputJsonValue,
        },
      });

      return patient;
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Patient not found');
    }

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Patient',
        entityId: id,
        details: {
          firstName: existing.firstName,
          lastName: existing.lastName,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { success: true };
  }

  async getAppointments(patientId: string, page: number, limit: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: { firstName: true, lastName: true, specialization: true },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where: { patientId } }),
    ]);

    return { appointments, total, page, limit };
  }
}
