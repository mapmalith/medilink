import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditListFilters {
  userId?: string;
  entity?: string;
  action?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const PAGE_DEFAULT = 1;
const SIZE_DEFAULT = 20;
const SIZE_MAX = 100;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: AuditListFilters) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const page = Math.max(1, filters.page ?? PAGE_DEFAULT);
    const pageSize = Math.min(
      SIZE_MAX,
      Math.max(1, filters.pageSize ?? SIZE_DEFAULT),
    );

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      }),
    ]);

    const userIds = Array.from(
      new Set(rows.map((r) => r.userId).filter((v): v is string => !!v)),
    );

    const [patients, doctors, staff, hotels] = await Promise.all([
      userIds.length
        ? this.prisma.patient.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.doctor.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.staff.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.hotel.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const nameByUserId = new Map<string, string>();
    for (const p of patients) {
      nameByUserId.set(p.userId, `${p.firstName} ${p.lastName}`);
    }
    for (const d of doctors) {
      nameByUserId.set(d.userId, `Dr. ${d.firstName} ${d.lastName}`);
    }
    for (const s of staff) {
      nameByUserId.set(s.userId, `${s.firstName} ${s.lastName}`);
    }
    for (const h of hotels) {
      nameByUserId.set(h.userId, h.name);
    }

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      rows: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        details: r.details,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
        user: r.user
          ? {
              id: r.user.id,
              email: r.user.email,
              role: r.user.role,
              displayName: nameByUserId.get(r.user.id) ?? r.user.email,
            }
          : null,
      })),
    };
  }

  async listEntities(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    });
    return rows.map((r) => r.entity);
  }

  async listActions(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return rows.map((r) => r.action);
  }
}
