import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DrugsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit = 20) {
    const q = query?.trim() ?? '';
    const where: Prisma.DrugWhereInput = { isActive: true };
    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.drug.findMany({
      where,
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: {
        id: true,
        name: true,
        genericName: true,
        strength: true,
        dosageForm: true,
      },
    });
  }
}
