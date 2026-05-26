import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

type StaffDepartment = 'ADMIN' | 'CALL_CENTER';

function departmentToRole(dept: StaffDepartment): Role {
  return dept === 'ADMIN' ? Role.ADMIN : Role.CALL_CENTER;
}

@Injectable()
export class AdminStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll() {
    const staff = await this.prisma.staff.findMany({
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = staff.map((s) => s.userId);
    const lastLogins = userIds.length
      ? await this.prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            userId: { in: userIds },
            action: 'LOGIN',
          },
          _max: { createdAt: true },
        })
      : [];

    const lastLoginMap = new Map<string, Date | null>();
    for (const entry of lastLogins) {
      if (entry.userId) {
        lastLoginMap.set(entry.userId, entry._max.createdAt ?? null);
      }
    }

    return staff.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      department: s.department,
      user: s.user,
      lastLogin: lastLoginMap.get(s.userId) ?? null,
      createdAt: s.createdAt,
    }));
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  async create(
    dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      department: StaffDepartment;
      phone?: string;
    },
    userId: string,
  ) {
    const passwordHash = await this.authService.hashPassword(dto.password);
    const role = departmentToRole(dto.department);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role,
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          department: dto.department,
        },
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Staff',
          entityId: staff.id,
          details: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            department: dto.department,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return staff;
    });
  }

  async update(
    id: string,
    dto: {
      email?: string;
      firstName?: string;
      lastName?: string;
      department?: StaffDepartment;
      phone?: string;
      isActive?: boolean;
    },
    userId: string,
  ) {
    const existing = await this.prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = {};
      if (dto.email !== undefined) userUpdate.email = dto.email;
      if (dto.phone !== undefined) userUpdate.phone = dto.phone;
      if (dto.isActive !== undefined) userUpdate.isActive = dto.isActive;
      if (dto.department !== undefined) {
        userUpdate.role = departmentToRole(dto.department);
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdate,
        });
      }

      const staffUpdate: Record<string, unknown> = {};
      if (dto.firstName !== undefined) staffUpdate.firstName = dto.firstName;
      if (dto.lastName !== undefined) staffUpdate.lastName = dto.lastName;
      if (dto.department !== undefined) staffUpdate.department = dto.department;

      const staff = await tx.staff.update({
        where: { id },
        data: staffUpdate,
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              role: true,
              isActive: true,
            },
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
          entity: 'Staff',
          entityId: id,
          details: logDetails satisfies Prisma.InputJsonValue,
        },
      });

      return staff;
    });
  }

  async toggleActive(id: string, userId: string) {
    const existing = await this.prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    const nextActive = !existing.user.isActive;

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: nextActive },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: nextActive ? 'ACTIVATE' : 'DEACTIVATE',
        entity: 'Staff',
        entityId: id,
        details: {
          isActive: nextActive,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { id, isActive: nextActive };
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Staff',
        entityId: id,
        details: {
          firstName: existing.firstName,
          lastName: existing.lastName,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { success: true };
  }
}
