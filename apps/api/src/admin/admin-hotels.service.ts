import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminHotelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll() {
    const hotels = await this.prisma.hotel.findMany({
      include: {
        user: {
          select: { email: true, phone: true, isActive: true },
        },
        _count: { select: { qrCodes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return hotels.map((hotel) => ({
      ...hotel,
      qrCodeCount: hotel._count.qrCodes,
      _count: undefined,
    }));
  }

  async findOne(id: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true, phone: true, isActive: true },
        },
        qrCodes: {
          orderBy: { createdAt: 'desc' },
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

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    return hotel;
  }

  async create(
    dto: {
      email: string;
      password: string;
      name: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      creditLimit?: number;
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
          role: Role.HOTEL,
        },
      });

      const hotel = await tx.hotel.create({
        data: {
          userId: user.id,
          name: dto.name,
          address: dto.address,
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email,
          creditLimit: dto.creditLimit ?? 0,
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
          entity: 'Hotel',
          entityId: hotel.id,
          details: {
            name: dto.name,
            email: dto.email,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return hotel;
    });
  }

  async update(
    id: string,
    dto: {
      email?: string;
      phone?: string;
      name?: string;
      address?: string;
      contactPerson?: string;
      creditLimit?: number;
      isActive?: boolean;
    },
    userId: string,
  ) {
    const existing = await this.prisma.hotel.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Hotel not found');
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

      const hotelUpdate: Record<string, unknown> = {};
      if (dto.name !== undefined) hotelUpdate.name = dto.name;
      if (dto.address !== undefined) hotelUpdate.address = dto.address;
      if (dto.contactPerson !== undefined) hotelUpdate.contactPerson = dto.contactPerson;
      if (dto.phone !== undefined) hotelUpdate.phone = dto.phone;
      if (dto.email !== undefined) hotelUpdate.email = dto.email;
      if (dto.creditLimit !== undefined) hotelUpdate.creditLimit = dto.creditLimit;

      const hotel = await tx.hotel.update({
        where: { id },
        data: hotelUpdate,
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
          },
        },
      });

      const logDetails: Record<string, string | number | boolean | null> = {};
      for (const [key, val] of Object.entries(dto)) {
        if (val !== undefined) {
          logDetails[key] = val as string | number | boolean | null;
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'Hotel',
          entityId: id,
          details: logDetails satisfies Prisma.InputJsonValue,
        },
      });

      return hotel;
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.hotel.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Hotel not found');
    }

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Hotel',
        entityId: id,
        details: {
          name: existing.name,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { success: true };
  }

  // --- QR Codes ---

  async getQRCodes(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    return this.prisma.qRCode.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateQRCode(hotelId: string, location: string, userId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const prefix = hotel.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    const locCode = location
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3);
    const code = `ML-${prefix}-${locCode}`;

    return this.prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.create({
        data: {
          hotelId,
          code,
          location,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'QRCode',
          entityId: qrCode.id,
          details: {
            hotelId,
            code,
            location,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return qrCode;
    });
  }

  // --- Credit Management ---

  async topUpCredit(
    hotelId: string,
    amount: number,
    description: string | undefined,
    userId: string,
  ) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const newCreditLimit = hotel.creditLimit.toNumber() + amount;

    return this.prisma.$transaction(async (tx) => {
      const updatedHotel = await tx.hotel.update({
        where: { id: hotelId },
        data: { creditLimit: newCreditLimit },
      });

      const balance = newCreditLimit - updatedHotel.creditUsed.toNumber();

      const ledgerEntry = await tx.creditLedger.create({
        data: {
          hotelId,
          amount,
          type: 'CREDIT_ADDED',
          description: description || `Credit top-up of $${amount.toFixed(2)}`,
          balance,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'HotelCredit',
          entityId: hotelId,
          details: {
            amount,
            newCreditLimit,
            balance,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return { hotel: updatedHotel, ledgerEntry };
    });
  }

  async getCreditLedger(hotelId: string, page: number, limit: number) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const [entries, total] = await Promise.all([
      this.prisma.creditLedger.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          appointment: {
            select: { id: true, appointmentType: true },
          },
        },
      }),
      this.prisma.creditLedger.count({ where: { hotelId } }),
    ]);

    return { entries, total, page, limit };
  }

  // --- Appointments ---

  async getAppointments(hotelId: string, page: number, limit: number) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { hotelId },
        include: {
          patient: {
            select: { firstName: true, lastName: true },
          },
          doctor: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where: { hotelId } }),
    ]);

    return { appointments, total, page, limit };
  }
}
