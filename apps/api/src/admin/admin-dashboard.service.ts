import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      appointmentsToday,
      appointmentsWeek,
      appointmentsMonth,
      pendingPayments,
      activeDoctors,
      activeHotels,
      revenueToday,
      revenueMonth,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: weekStart, lt: todayEnd },
        },
      }),
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: monthStart, lt: todayEnd },
        },
      }),
      this.prisma.appointment.count({
        where: {
          paymentStatus: 'PENDING',
        },
      }),
      this.prisma.doctor.count({
        where: {
          user: { isActive: true },
        },
      }),
      this.prisma.hotel.count({
        where: {
          user: { isActive: true },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          paidAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          paidAt: { gte: monthStart, lt: todayEnd },
        },
      }),
    ]);

    return {
      appointmentsToday,
      appointmentsWeek,
      appointmentsMonth,
      pendingPayments,
      activeDoctors,
      activeHotels,
      revenueToday: revenueToday._sum.amount?.toNumber() ?? 0,
      revenueMonth: revenueMonth._sum.amount?.toNumber() ?? 0,
    };
  }

  async getTodaysAppointments() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: {
        scheduledDate: { gte: todayStart, lt: todayEnd },
      },
      select: {
        id: true,
        appointmentType: true,
        status: true,
        scheduledDate: true,
        scheduledTime: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      take: 20,
    });
  }

  async getRecentActivity() {
    return this.prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
