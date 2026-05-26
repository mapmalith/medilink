import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const baseInclude = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      whatsappNumber: true,
      nationality: true,
    },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialization: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof baseInclude;
}>;

function serialize(appt: AppointmentWithRelations) {
  return {
    ...appt,
    amountCharged: appt.amountCharged?.toNumber() ?? null,
  };
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

@Injectable()
export class HotelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the Hotel row from a User id (as returned by the JWT).
   */
  async getHotelForUser(userId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, phone: true, isActive: true } },
      },
    });
    if (!hotel) {
      throw new ForbiddenException('No hotel profile linked to this user');
    }
    return hotel;
  }

  async getMe(userId: string) {
    const hotel = await this.getHotelForUser(userId);
    return {
      ...hotel,
      creditLimit: hotel.creditLimit.toNumber(),
      creditUsed: hotel.creditUsed.toNumber(),
    };
  }

  async getDashboardStats(userId: string) {
    const hotel = await this.getHotelForUser(userId);
    const today = startOfUtcDay(new Date());
    const tomorrow = addDays(today, 1);

    const activeStatuses: AppointmentStatus[] = [
      AppointmentStatus.PENDING_PAYMENT,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.ASSIGNED,
      AppointmentStatus.IN_PROGRESS,
    ];

    const [activeAppointments, completedToday, todayList] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          hotelId: hotel.id,
          status: { in: activeStatuses },
        },
      }),
      this.prisma.appointment.count({
        where: {
          hotelId: hotel.id,
          scheduledDate: { gte: today, lt: tomorrow },
          status: AppointmentStatus.COMPLETED,
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          hotelId: hotel.id,
          scheduledDate: { gte: today, lt: tomorrow },
          status: {
            notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.EXPIRED],
          },
        },
        include: baseInclude,
        orderBy: [{ scheduledTime: 'asc' }],
      }),
    ]);

    const creditLimit = hotel.creditLimit.toNumber();
    const creditUsed = hotel.creditUsed.toNumber();
    const creditBalance = creditLimit - creditUsed;

    return {
      activeAppointments,
      completedToday,
      creditLimit,
      creditUsed,
      creditBalance,
      todayList: todayList.map(serialize),
    };
  }

  async listAppointments(
    userId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      status?: AppointmentStatus;
      appointmentType?: AppointmentType;
    },
  ) {
    const hotel = await this.getHotelForUser(userId);

    const where: Prisma.AppointmentWhereInput = { hotelId: hotel.id };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.appointmentType) {
      where.appointmentType = filters.appointmentType;
    }
    if (filters.startDate || filters.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) {
        where.scheduledDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.scheduledDate.lte = new Date(filters.endDate);
      }
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: baseInclude,
      orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
    });

    return appointments.map(serialize);
  }

  async getCreditInfo(userId: string) {
    const hotel = await this.getHotelForUser(userId);

    const creditLimit = hotel.creditLimit.toNumber();
    const creditUsed = hotel.creditUsed.toNumber();

    return {
      creditLimit,
      creditUsed,
      creditBalance: creditLimit - creditUsed,
    };
  }

  async listCreditLedger(
    userId: string,
    filters: { startDate?: string; endDate?: string; type?: string },
  ) {
    const hotel = await this.getHotelForUser(userId);

    const where: Prisma.CreditLedgerWhereInput = { hotelId: hotel.id };
    if (filters.type) {
      where.type = { equals: filters.type, mode: 'insensitive' };
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Include the full end day.
        const end = new Date(filters.endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const ledger = await this.prisma.creditLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        appointment: {
          select: { id: true, appointmentType: true },
        },
      },
    });

    return ledger.map((entry) => ({
      ...entry,
      amount: entry.amount.toNumber(),
      balance: entry.balance.toNumber(),
    }));
  }

  async listInvoices(
    userId: string,
    filters: { startDate?: string; endDate?: string },
  ) {
    const hotel = await this.getHotelForUser(userId);

    const where: Prisma.InvoiceWhereInput = {
      appointment: { hotelId: hotel.id },
    };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          select: {
            id: true,
            appointmentType: true,
            scheduledDate: true,
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount.toNumber(),
      currency: invoice.currency,
      pdfS3Key: invoice.pdfS3Key,
      pdfUrl: invoice.pdfS3Key
        ? `/api/v1/hotel/invoices/${invoice.id}/pdf`
        : null,
      createdAt: invoice.createdAt,
      sentViaWhatsApp: invoice.sentViaWhatsApp,
      sentViaEmail: invoice.sentViaEmail,
      appointment: {
        id: invoice.appointment.id,
        appointmentType: invoice.appointment.appointmentType,
        scheduledDate: invoice.appointment.scheduledDate,
        patient: invoice.appointment.patient,
      },
    }));
  }
}
