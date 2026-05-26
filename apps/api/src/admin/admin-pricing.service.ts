import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AppointmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.appointmentPricing.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    dto: {
      appointmentType: AppointmentType;
      price: number;
      currency: string;
      effectiveFrom: Date;
      effectiveTo?: Date;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.appointmentPricing.updateMany({
        where: { appointmentType: dto.appointmentType, isActive: true },
        data: { isActive: false },
      });

      const record = await tx.appointmentPricing.create({ data: dto });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'AppointmentPricing',
          entityId: record.id,
          details: {
            appointmentType: dto.appointmentType,
            price: dto.price,
            currency: dto.currency,
            effectiveFrom: dto.effectiveFrom.toISOString(),
            effectiveTo: dto.effectiveTo?.toISOString() ?? null,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return record;
    });
  }

  async update(
    id: string,
    dto: {
      appointmentType?: AppointmentType;
      price?: number;
      currency?: string;
      isActive?: boolean;
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
    },
    userId: string,
  ) {
    const existing = await this.prisma.appointmentPricing.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Pricing record not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const type = dto.appointmentType ?? existing.appointmentType;
      if (dto.isActive === true || (dto.isActive === undefined && existing.isActive)) {
        await tx.appointmentPricing.updateMany({
          where: { appointmentType: type, isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }

      const record = await tx.appointmentPricing.update({
        where: { id },
        data: dto,
      });

      const logDetails: Record<string, string | number | boolean | null> = {};
      if (dto.appointmentType !== undefined) logDetails.appointmentType = dto.appointmentType;
      if (dto.price !== undefined) logDetails.price = dto.price;
      if (dto.currency !== undefined) logDetails.currency = dto.currency;
      if (dto.isActive !== undefined) logDetails.isActive = dto.isActive;
      if (dto.effectiveFrom !== undefined) logDetails.effectiveFrom = dto.effectiveFrom.toISOString();
      if (dto.effectiveTo !== undefined) logDetails.effectiveTo = dto.effectiveTo?.toISOString() ?? null;

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'AppointmentPricing',
          entityId: id,
          details: logDetails satisfies Prisma.InputJsonValue,
        },
      });

      return record;
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.appointmentPricing.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Pricing record not found');
    }

    const record = await this.prisma.appointmentPricing.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'AppointmentPricing',
        entityId: id,
        details: {
          appointmentType: existing.appointmentType,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return record;
  }
}
