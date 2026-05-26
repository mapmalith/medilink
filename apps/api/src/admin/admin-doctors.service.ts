import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, AppointmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminDoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll() {
    return this.prisma.doctor.findMany({
      include: {
        user: {
          select: { email: true, phone: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true, phone: true, isActive: true },
        },
        availability: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        appointments: {
          take: 10,
          orderBy: { scheduledDate: 'desc' },
          include: {
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  async create(
    dto: {
      email: string;
      password: string;
      phone?: string;
      firstName: string;
      lastName: string;
      specialization?: string;
      licenseNumber: string;
      whatsappNumber?: string;
      isAvailableHouseCall?: boolean;
      isAvailableTeleConsult?: boolean;
      isAvailableMedicalVisit?: boolean;
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
          role: Role.DOCTOR,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          specialization: dto.specialization,
          licenseNumber: dto.licenseNumber,
          whatsappNumber: dto.whatsappNumber,
          isAvailableHouseCall: dto.isAvailableHouseCall ?? false,
          isAvailableTeleConsult: dto.isAvailableTeleConsult ?? false,
          isAvailableMedicalVisit: dto.isAvailableMedicalVisit ?? false,
        },
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Doctor',
          entityId: doctor.id,
          details: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            licenseNumber: dto.licenseNumber,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return doctor;
    });
  }

  async update(
    id: string,
    dto: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      specialization?: string;
      licenseNumber?: string;
      whatsappNumber?: string;
      isAvailableHouseCall?: boolean;
      isAvailableTeleConsult?: boolean;
      isAvailableMedicalVisit?: boolean;
      isActive?: boolean;
    },
    userId: string,
  ) {
    const existing = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update user fields if provided
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

      // Update doctor fields
      const doctorUpdate: Record<string, unknown> = {};
      if (dto.firstName !== undefined) doctorUpdate.firstName = dto.firstName;
      if (dto.lastName !== undefined) doctorUpdate.lastName = dto.lastName;
      if (dto.specialization !== undefined) doctorUpdate.specialization = dto.specialization;
      if (dto.licenseNumber !== undefined) doctorUpdate.licenseNumber = dto.licenseNumber;
      if (dto.whatsappNumber !== undefined) doctorUpdate.whatsappNumber = dto.whatsappNumber;
      if (dto.isAvailableHouseCall !== undefined) doctorUpdate.isAvailableHouseCall = dto.isAvailableHouseCall;
      if (dto.isAvailableTeleConsult !== undefined) doctorUpdate.isAvailableTeleConsult = dto.isAvailableTeleConsult;
      if (dto.isAvailableMedicalVisit !== undefined) doctorUpdate.isAvailableMedicalVisit = dto.isAvailableMedicalVisit;

      const doctor = await tx.doctor.update({
        where: { id },
        data: doctorUpdate,
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
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
          entity: 'Doctor',
          entityId: id,
          details: logDetails satisfies Prisma.InputJsonValue,
        },
      });

      return doctor;
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Doctor not found');
    }

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Doctor',
        entityId: id,
        details: {
          firstName: existing.firstName,
          lastName: existing.lastName,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { success: true };
  }

  async getAvailability(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async replaceAvailability(
    doctorId: string,
    slots: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      appointmentType: AppointmentType;
      isActive: boolean;
    }[],
    userId: string,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({
        where: { doctorId },
      });

      if (slots.length > 0) {
        await tx.doctorAvailability.createMany({
          data: slots.map((slot) => ({
            doctorId,
            ...slot,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'DoctorAvailability',
          entityId: doctorId,
          details: {
            slotsCount: slots.length,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return tx.doctorAvailability.findMany({
        where: { doctorId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async getAppointments(doctorId: string, page: number, limit: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { doctorId },
        include: {
          patient: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where: { doctorId } }),
    ]);

    return { appointments, total, page, limit };
  }
}
