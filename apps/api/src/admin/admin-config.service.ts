import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface ConfigDefault {
  value: string;
  description: string;
}

const CONFIG_DEFAULTS: Record<string, ConfigDefault> = {
  teleconsult_slot_duration_minutes: {
    value: '30',
    description: 'Duration of each tele-consultation slot in minutes',
  },
  teleconsult_payment_timeout_minutes: {
    value: '60',
    description: 'Minutes before unpaid appointment is auto-cancelled',
  },
  house_call_payment_required: {
    value: 'true',
    description: 'Whether house call appointments require payment before visit',
  },
  max_reschedules: {
    value: '3',
    description: 'Maximum number of reschedules per appointment',
  },
  reschedule_notice_hours: {
    value: '2',
    description: 'Minimum hours before appointment to allow rescheduling',
  },
  default_currency: {
    value: 'USD',
    description: 'Default currency for payments',
  },
};

@Injectable()
export class AdminConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // Ensure all expected config keys exist with defaults
    for (const [key, def] of Object.entries(CONFIG_DEFAULTS)) {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: def.value,
          description: def.description,
        },
      });
    }

    return this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async update(key: string, value: string, userId: string) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException(`Config key '${key}' not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.systemConfig.update({
        where: { key },
        data: { value },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'SystemConfig',
          entityId: existing.id,
          details: {
            key,
            previousValue: existing.value,
            newValue: value,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }
}
