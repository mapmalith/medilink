import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDrugsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.drug.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const drug = await this.prisma.drug.findUnique({ where: { id } });
    if (!drug) {
      throw new NotFoundException('Drug not found');
    }
    return drug;
  }

  async create(
    dto: {
      name: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      dosageForm?: string;
      strength?: string;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const drug = await tx.drug.create({ data: dto });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Drug',
          entityId: drug.id,
          details: {
            name: dto.name,
            genericName: dto.genericName ?? null,
            category: dto.category ?? null,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return drug;
    });
  }

  async update(
    id: string,
    dto: {
      name?: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      dosageForm?: string;
      strength?: string;
      isActive?: boolean;
    },
    userId: string,
  ) {
    const existing = await this.prisma.drug.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Drug not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const drug = await tx.drug.update({ where: { id }, data: dto });

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
          entity: 'Drug',
          entityId: id,
          details: logDetails satisfies Prisma.InputJsonValue,
        },
      });

      return drug;
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.drug.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Drug not found');
    }

    const drug = await this.prisma.drug.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Drug',
        entityId: id,
        details: {
          name: existing.name,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return drug;
  }
}
