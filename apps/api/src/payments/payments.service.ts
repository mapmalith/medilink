import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppDispatcher } from '../modules/whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../modules/whatsapp/templates';
import { JobSchedulerService } from '../modules/jobs/job-scheduler.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppDispatcher,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly jobs: JobSchedulerService,
  ) {}

  /**
   * Generate a payment link for an appointment. Any role authorised to book
   * may call this for appointments they own (HOTEL only for their own hotel,
   * ADMIN/CALL_CENTER for any).
   */
  async createPaymentLink(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.status !== AppointmentStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Only pending-payment appointments can have a payment link generated',
      );
    }

    await this.assertCanManageAppointment(appointment.hotelId, userId, userRole);

    if (!appointment.amountCharged) {
      throw new BadRequestException(
        'Appointment has no amount charged — cannot create a payment link',
      );
    }

    // Create a real Stripe Checkout Session. Success/cancel URLs point at
    // dashboard pages; the webhook is the source of truth for payment.
    const baseUrl = this.config.get<string>(
      'MEDILINK_BASE_URL',
      'http://localhost:3000',
    );
    const ref = appointment.id.slice(0, 8).toUpperCase();
    const session = await this.stripe.createCheckoutSession({
      appointmentId: appointment.id,
      amount: appointment.amountCharged.toNumber(),
      currency: appointment.currency,
      description: `MEDI LINK Appointment #${ref}`,
      successUrl: `${baseUrl}/payments/success?appointmentId=${appointment.id}`,
      cancelUrl: `${baseUrl}/payments/cancel?appointmentId=${appointment.id}`,
    });
    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }
    const url = session.url;
    const expiry = new Date((session.expires_at ?? 0) * 1000);

    const updated = await this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          paymentMethod: PaymentMethod.PAYMENT_LINK,
          paymentLinkUrl: url,
          paymentLinkExpiry: expiry,
        },
      });

      await tx.payment.create({
        data: {
          appointmentId: appointment.id,
          amount: appointment.amountCharged!,
          currency: appointment.currency,
          method: PaymentMethod.PAYMENT_LINK,
          status: PaymentStatus.PENDING,
          stripePaymentId: session.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_LINK_CREATE',
          entity: 'Appointment',
          entityId: appointment.id,
          details: {
            stripeSessionId: session.id,
            url,
            expiry: expiry.toISOString(),
          } satisfies Prisma.InputJsonValue,
        },
      });

      return appt;
    });

    // Fire-and-forget WhatsApp notification to the patient.
    const patient = await this.prisma.patient.findUnique({
      where: { id: appointment.patientId },
      select: { whatsappNumber: true },
    });
    await this.whatsapp.tryTextMessage(
      patient?.whatsappNumber,
      TEMPLATES.bookingConfirmed(ref, url),
      { appointmentId: appointment.id },
    );

    return {
      appointmentId: updated.id,
      paymentUrl: url,
      paymentLinkId: session.id,
      expiry,
    };
  }

  /**
   * Process a Stripe webhook event. Verifies the signature, then for
   * `checkout.session.completed` events marks the corresponding Payment
   * as PAID, the Appointment as CONFIRMED + paymentStatus=PAID, and
   * fires a WhatsApp paymentReceived notification.
   *
   * Called from the PaymentsWebhookController. Throws on signature
   * mismatch; handler returns 200 so Stripe stops retrying for that case.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructWebhookEvent(rawBody, signature);

    if (event.type !== 'checkout.session.completed') {
      // Other event types are intentionally ignored for now.
      return;
    }

    const session = event.data.object as { id: string; metadata?: { appointmentId?: string } };
    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId) {
      throw new BadRequestException(
        'Checkout session has no appointmentId metadata',
      );
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment ${appointmentId} not found`);
    }

    // Idempotent: skip if already processed.
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripePaymentId: session.id },
    });
    if (existingPayment?.status === PaymentStatus.PAID) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update the Payment record (match by stripePaymentId = session.id)
      await tx.payment.updateMany({
        where: { stripePaymentId: session.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      // Update the Appointment: only move PENDING_PAYMENT → CONFIRMED.
      const apptUpdate: Prisma.AppointmentUpdateInput = {
        paymentStatus: PaymentStatus.PAID,
      };
      if (appointment.status === AppointmentStatus.PENDING_PAYMENT) {
        apptUpdate.status = AppointmentStatus.CONFIRMED;
      }
      await tx.appointment.update({
        where: { id: appointmentId },
        data: apptUpdate,
      });

      await tx.auditLog.create({
        data: {
          userId: null,
          action: 'PAYMENT_RECEIVED',
          entity: 'Appointment',
          entityId: appointmentId,
          details: {
            stripeSessionId: session.id,
            previousStatus: appointment.status,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    // Fire-and-forget WhatsApp notification.
    const patient = await this.prisma.patient.findUnique({
      where: { id: appointment.patientId },
      select: { whatsappNumber: true },
    });
    const ref = appointmentId.slice(0, 8).toUpperCase();
    await this.whatsapp.tryTextMessage(
      patient?.whatsappNumber,
      TEMPLATES.paymentReceived(ref),
      { appointmentId },
    );

    if (appointment.status === AppointmentStatus.PENDING_PAYMENT) {
      await this.jobs.cancelJobsForAppointment(appointmentId);
      await this.jobs.scheduleReminder(appointmentId, appointment.scheduledTime);
      if (appointment.appointmentType === AppointmentType.TELE_CONSULTATION) {
        await this.jobs.scheduleVideoRoomCreation(
          appointmentId,
          appointment.scheduledTime,
        );
      }
    }
  }

  /**
   * Pay for an appointment using the hotel's credit limit. Deducts the amount
   * from `creditUsed`, records a CreditLedger entry, marks the payment as
   * CREDIT_USED and the appointment as CONFIRMED.
   */
  async payWithCredit(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (!appointment.hotelId) {
      throw new BadRequestException(
        'Appointment is not linked to a hotel — cannot pay with credit',
      );
    }
    if (appointment.status !== AppointmentStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Only pending-payment appointments can be paid',
      );
    }
    if (!appointment.amountCharged) {
      throw new BadRequestException('Appointment has no amount to charge');
    }

    await this.assertCanManageAppointment(appointment.hotelId, userId, userRole);

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: appointment.hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const amount = appointment.amountCharged;
    const newCreditUsed = hotel.creditUsed.add(amount);
    if (newCreditUsed.greaterThan(hotel.creditLimit)) {
      throw new BadRequestException(
        'Insufficient hotel credit to cover this booking',
      );
    }
    const remainingBalance = hotel.creditLimit.minus(newCreditUsed);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.hotel.update({
        where: { id: hotel.id },
        data: { creditUsed: newCreditUsed },
      });

      await tx.creditLedger.create({
        data: {
          hotelId: hotel.id,
          amount,
          type: 'DEBIT',
          description: `Appointment ${appointment.id}`,
          appointmentId: appointment.id,
          balance: remainingBalance,
        },
      });

      await tx.payment.create({
        data: {
          appointmentId: appointment.id,
          amount,
          currency: appointment.currency,
          method: PaymentMethod.CREDIT_LIMIT,
          status: PaymentStatus.CREDIT_USED,
          paidAt: new Date(),
        },
      });

      const appt = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CONFIRMED,
          paymentStatus: PaymentStatus.CREDIT_USED,
          paymentMethod: PaymentMethod.CREDIT_LIMIT,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_CREDIT_USED',
          entity: 'Appointment',
          entityId: appointment.id,
          details: {
            amount: amount.toNumber(),
            hotelId: hotel.id,
            newCreditUsed: newCreditUsed.toNumber(),
          } satisfies Prisma.InputJsonValue,
        },
      });

      return appt;
    });

    // Fire-and-forget WhatsApp notification to the patient.
    const patient = await this.prisma.patient.findUnique({
      where: { id: appointment.patientId },
      select: { whatsappNumber: true },
    });
    const ref = appointment.id.slice(0, 8).toUpperCase();
    await this.whatsapp.tryTextMessage(
      patient?.whatsappNumber,
      TEMPLATES.paymentReceived(ref),
      { appointmentId: appointment.id },
    );

    await this.jobs.cancelJobsForAppointment(appointment.id);
    await this.jobs.scheduleReminder(appointment.id, appointment.scheduledTime);
    if (appointment.appointmentType === AppointmentType.TELE_CONSULTATION) {
      await this.jobs.scheduleVideoRoomCreation(
        appointment.id,
        appointment.scheduledTime,
      );
    }

    return {
      appointmentId: result.id,
      status: result.status,
      paymentStatus: result.paymentStatus,
      creditUsed: newCreditUsed.toNumber(),
      creditRemaining: remainingBalance.toNumber(),
    };
  }

  /**
   * Return the current payment state for an appointment — handy for the
   * post-checkout "success" page to poll until the webhook has processed.
   */
  async getPaymentStatus(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        amountCharged: true,
        currency: true,
        hotelId: true,
        paymentLinkUrl: true,
        paymentLinkExpiry: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.assertCanManageAppointment(
      appointment.hotelId,
      userId,
      userRole,
    );

    const latestPayment = await this.prisma.payment.findFirst({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        method: true,
        amount: true,
        currency: true,
        stripePaymentId: true,
        paidAt: true,
      },
    });

    return {
      appointmentId: appointment.id,
      appointmentStatus: appointment.status,
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod,
      amountCharged: appointment.amountCharged?.toNumber() ?? null,
      currency: appointment.currency,
      paymentLinkUrl: appointment.paymentLinkUrl,
      paymentLinkExpiry: appointment.paymentLinkExpiry,
      latestPayment: latestPayment
        ? {
            ...latestPayment,
            amount: latestPayment.amount.toNumber(),
          }
        : null,
    };
  }

  private async assertCanManageAppointment(
    appointmentHotelId: string | null,
    userId: string,
    userRole: Role,
  ) {
    if (userRole === Role.ADMIN || userRole === Role.CALL_CENTER) return;
    if (userRole === Role.HOTEL) {
      if (!appointmentHotelId) {
        throw new ForbiddenException(
          'This appointment is not linked to any hotel',
        );
      }
      const hotel = await this.prisma.hotel.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!hotel || hotel.id !== appointmentHotelId) {
        throw new ForbiddenException(
          'You may only manage appointments for your own hotel',
        );
      }
      return;
    }
    throw new ForbiddenException('Not permitted');
  }
}
