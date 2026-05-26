import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentType,
  Role,
  WhatsAppConversationState as State,
} from '@prisma/client';
import { format, parse, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from '../../appointments/appointments.service';
import { PaymentsService } from '../../payments/payments.service';
import { WhatsAppDispatcher } from './whatsapp-dispatcher.service';
import { TEMPLATES } from './templates';

interface StateData {
  hotelCode?: string;
  hotelId?: string;
  hotelName?: string;
  patientName?: string;
  appointmentType?: AppointmentType;
  date?: string; // yyyy-MM-dd
  timeSlotId?: string;
  scheduledTime?: string; // ISO
  timeLabel?: string;
  slotOptions?: { id: string; time: string; doctor: string }[];
  price?: string;
  currency?: string;
}

const TYPE_MAP: Record<string, AppointmentType> = {
  '1': AppointmentType.HOUSE_CALL,
  '2': AppointmentType.TELE_CONSULTATION,
  '3': AppointmentType.MEDICAL_VISIT,
};

const TYPE_LABEL: Record<string, string> = {
  HOUSE_CALL: 'House Call',
  TELE_CONSULTATION: 'Video Consultation',
  MEDICAL_VISIT: 'Medical Visit',
};

const TIME_LABELS: Record<string, { label: string; hour: number }> = {
  '1': { label: 'Morning (09:00)', hour: 9 },
  '2': { label: 'Afternoon (14:00)', hour: 14 },
  '3': { label: 'Evening (18:00)', hour: 18 },
};

@Injectable()
export class ConversationStateService implements OnModuleInit {
  private readonly logger = new Logger(ConversationStateService.name);
  private systemUserId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly appointments: AppointmentsService,
    private readonly payments: PaymentsService,
    private readonly wa: WhatsAppDispatcher,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>(
      'SYSTEM_USER_EMAIL',
      'system@medilink.lk',
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      this.systemUserId = user.id;
      this.logger.log(`System user resolved: ${email} → ${user.id}`);
    } else {
      this.logger.warn(
        `System user ${email} not found. Run pnpm db:seed to create it.`,
      );
    }
  }

  async handleMessage(
    phone: string,
    body: string,
    _profileName: string,
  ): Promise<void> {
    const text = body.trim();
    const upper = text.toUpperCase();

    // Load or create conversation state.
    let conv = await this.prisma.whatsAppConversation.findUnique({
      where: { phone },
    });
    if (!conv) {
      conv = await this.prisma.whatsAppConversation.create({
        data: { phone, state: State.IDLE },
      });
    }
    const data: StateData = (conv.stateData as StateData) ?? {};

    // CANCEL from any state resets to IDLE.
    if (upper === 'CANCEL') {
      await this.setState(phone, State.IDLE, {});
      await this.reply(phone, 'Session cancelled. Scan a QR code to start a new booking.', conv.state);
      return;
    }

    // BOOK_{code} starts a new flow from any state.
    if (upper.startsWith('BOOK_')) {
      await this.handleBookCommand(phone, text);
      return;
    }

    // Route by current state.
    switch (conv.state) {
      case State.IDLE:
        await this.reply(
          phone,
          'Welcome to MEDI LINK! Scan a hotel QR code to start a booking, or type BOOK_{code}.',
          conv.state,
        );
        break;
      case State.AWAITING_NAME:
        await this.handleName(phone, text, data);
        break;
      case State.AWAITING_TYPE:
        await this.handleType(phone, text, data);
        break;
      case State.AWAITING_DATE:
        await this.handleDate(phone, text, data);
        break;
      case State.AWAITING_TIME_SLOT:
        await this.handleTimeSlot(phone, text, data);
        break;
      case State.AWAITING_CONFIRMATION:
        await this.handleConfirmation(phone, text, data);
        break;
    }
  }

  // ─── Flow handlers ────────────────────────────────────────────────────────

  private async handleBookCommand(phone: string, text: string) {
    const code = text.replace(/^BOOK_/i, '').trim();
    const qr = await this.prisma.qRCode.findUnique({
      where: { code },
      include: { hotel: { select: { id: true, name: true, address: true } } },
    });
    if (!qr || !qr.isActive) {
      await this.reply(phone, 'Invalid or inactive QR code. Please try again.', 'IDLE');
      return;
    }

    // Bump scan count
    await this.prisma.qRCode.update({
      where: { id: qr.id },
      data: { scanCount: { increment: 1 } },
    });

    await this.setState(phone, State.AWAITING_NAME, {
      hotelCode: code,
      hotelId: qr.hotel.id,
      hotelName: qr.hotel.name,
    });

    await this.reply(phone, TEMPLATES.welcome(qr.hotel.name), 'AWAITING_NAME');
  }

  private async handleName(phone: string, text: string, data: StateData) {
    if (text.length < 2) {
      await this.reply(phone, 'Please enter your full name (at least 2 characters).', 'AWAITING_NAME');
      return;
    }

    data.patientName = text;
    await this.setState(phone, State.AWAITING_TYPE, data);
    await this.reply(phone, TEMPLATES.askType(text), 'AWAITING_TYPE');
  }

  private async handleType(phone: string, text: string, data: StateData) {
    const type = TYPE_MAP[text];
    if (!type) {
      await this.reply(phone, TEMPLATES.invalidInput(), 'AWAITING_TYPE');
      return;
    }

    data.appointmentType = type;
    await this.setState(phone, State.AWAITING_DATE, data);
    await this.reply(phone, TEMPLATES.askDate(), 'AWAITING_DATE');
  }

  private async handleDate(phone: string, text: string, data: StateData) {
    // Parse DD/MM/YYYY
    const parsed = parse(text, 'dd/MM/yyyy', new Date());
    if (isNaN(parsed.getTime())) {
      await this.reply(phone, TEMPLATES.invalidDate(), 'AWAITING_DATE');
      return;
    }

    const tomorrow = startOfDay(addDays(new Date(), 1));
    const maxDate = addDays(new Date(), 30);
    if (isBefore(parsed, tomorrow) || isAfter(parsed, maxDate)) {
      await this.reply(phone, TEMPLATES.invalidDate(), 'AWAITING_DATE');
      return;
    }

    const dateStr = format(parsed, 'yyyy-MM-dd');
    data.date = dateStr;

    if (data.appointmentType === AppointmentType.TELE_CONSULTATION) {
      // Fetch available slots
      const slots = await this.appointments.listAvailableSlots(
        dateStr,
        AppointmentType.TELE_CONSULTATION,
      );
      if (!slots || slots.length === 0) {
        await this.reply(
          phone,
          TEMPLATES.noSlotsAvailable(format(parsed, 'dd/MM/yyyy')),
          'AWAITING_DATE',
        );
        return;
      }

      const slotOptions = slots.slice(0, 9).map((s, i) => ({
        id: s.id,
        time: format(new Date(s.startTime), 'hh:mm a'),
        doctor: `${s.doctor.firstName} ${s.doctor.lastName}`,
      }));
      data.slotOptions = slotOptions;
      await this.setState(phone, State.AWAITING_TIME_SLOT, data);

      const numbered = slotOptions.map((s, i) => ({
        num: i + 1,
        time: s.time,
        doctor: s.doctor,
      }));
      await this.reply(
        phone,
        TEMPLATES.showSlots(format(parsed, 'dd/MM/yyyy'), numbered),
        'AWAITING_TIME_SLOT',
      );
    } else {
      // House call or medical visit — ask for time preference
      await this.setState(phone, State.AWAITING_TIME_SLOT, data);
      await this.reply(phone, TEMPLATES.askTimeOfDay(), 'AWAITING_TIME_SLOT');
    }
  }

  private async handleTimeSlot(
    phone: string,
    text: string,
    data: StateData,
  ) {
    if (data.appointmentType === AppointmentType.TELE_CONSULTATION) {
      const idx = parseInt(text, 10);
      if (!data.slotOptions || isNaN(idx) || idx < 1 || idx > data.slotOptions.length) {
        await this.reply(phone, TEMPLATES.invalidInput(), 'AWAITING_TIME_SLOT');
        return;
      }
      const chosen = data.slotOptions[idx - 1];
      data.timeSlotId = chosen.id;
      data.timeLabel = `${chosen.time} (Dr. ${chosen.doctor})`;
    } else {
      const choice = TIME_LABELS[text];
      if (!choice) {
        await this.reply(phone, TEMPLATES.invalidInput(), 'AWAITING_TIME_SLOT');
        return;
      }
      // Build ISO datetime from date + chosen hour
      const dt = new Date(`${data.date}T${String(choice.hour).padStart(2, '0')}:00:00`);
      data.scheduledTime = dt.toISOString();
      data.timeLabel = choice.label;
    }

    // Look up price
    const pricing = await this.prisma.appointmentPricing.findFirst({
      where: { appointmentType: data.appointmentType!, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    data.price = pricing ? pricing.price.toNumber().toFixed(2) : '0.00';
    data.currency = pricing?.currency ?? 'USD';

    await this.setState(phone, State.AWAITING_CONFIRMATION, data);

    await this.reply(
      phone,
      TEMPLATES.confirmBooking({
        name: data.patientName!,
        type: TYPE_LABEL[data.appointmentType!] ?? data.appointmentType!,
        date: format(new Date(data.date!), 'EEEE, dd/MM/yyyy'),
        time: data.timeLabel!,
        price: `${data.currency} ${data.price}`,
      }),
      'AWAITING_CONFIRMATION',
    );
  }

  private async handleConfirmation(
    phone: string,
    text: string,
    data: StateData,
  ) {
    const upper = text.toUpperCase();

    if (upper === 'NO') {
      await this.setState(phone, State.IDLE, {});
      await this.reply(
        phone,
        TEMPLATES.bookingCancelled(data.hotelCode ?? ''),
        'IDLE',
      );
      return;
    }

    if (upper !== 'YES') {
      await this.reply(phone, 'Reply YES to confirm or NO to cancel.', 'AWAITING_CONFIRMATION');
      return;
    }

    if (!this.systemUserId) {
      await this.reply(
        phone,
        'System error — please try again later or call our hotline.',
        'AWAITING_CONFIRMATION',
      );
      this.logger.error('Cannot create appointment: system user not configured');
      return;
    }

    try {
      // 1. Find or create patient by whatsAppNumber
      const patient = await this.findOrCreatePatient(phone, data);

      // 2. Create appointment
      const nameParts = (data.patientName ?? 'Guest').split(' ');
      const appt = await this.appointments.createAppointment(
        {
          patientId: patient.id,
          appointmentType: data.appointmentType!,
          scheduledDate:
            data.appointmentType === AppointmentType.TELE_CONSULTATION
              ? undefined
              : data.date,
          scheduledTime:
            data.appointmentType === AppointmentType.TELE_CONSULTATION
              ? undefined
              : data.scheduledTime,
          timeSlotId:
            data.appointmentType === AppointmentType.TELE_CONSULTATION
              ? data.timeSlotId
              : undefined,
          hotelId: data.hotelId,
          bookedBy: Role.PATIENT,
        },
        this.systemUserId,
        Role.ADMIN,
      );

      // 3. Generate payment link — this also fires the bookingConfirmed
      //    WhatsApp notification to the patient via PaymentsService, so we
      //    don't send it manually here.
      await this.payments.createPaymentLink(
        appt.id,
        this.systemUserId,
        Role.ADMIN,
      );

      // 4. Reset state (patient already received bookingConfirmed from
      //    PaymentsService via the shared WhatsAppDispatcher).
      await this.setState(phone, State.IDLE, {});
    } catch (err) {
      this.logger.error('Booking creation failed', err);
      await this.reply(
        phone,
        'Something went wrong creating your booking. Please try again or call our hotline.',
        'AWAITING_CONFIRMATION',
      );
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOrCreatePatient(phone: string, data: StateData) {
    // Look up by whatsappNumber
    const existing = await this.prisma.patient.findFirst({
      where: { whatsappNumber: phone },
    });
    if (existing) return existing;

    // Create a new patient + user
    const nameParts = (data.patientName ?? 'Guest').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';
    const email = `wa_${phone.replace(/\+/g, '')}@medilink.lk`;
    const bcrypt = await import('bcryptjs');
    const tempPassword = await bcrypt.hash(`WA_${Date.now()}`, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: tempPassword,
        role: Role.PATIENT,
        patient: {
          create: {
            firstName,
            lastName,
            whatsappNumber: phone,
            hotelId: data.hotelId ?? null,
          },
        },
      },
      include: { patient: true },
    });

    return user.patient!;
  }

  private async setState(
    phone: string,
    state: State,
    data: StateData,
  ): Promise<void> {
    await this.prisma.whatsAppConversation.upsert({
      where: { phone },
      update: { state, stateData: data as any },
      create: { phone, state, stateData: data as any },
    });
  }

  private async reply(
    phone: string,
    body: string,
    state: string,
  ): Promise<void> {
    await this.wa.sendTextMessage(phone, body);
  }
}
