/**
 * WhatsApp message templates. Plain TS template strings — no Meta template
 * approval needed when sending via Twilio within the 24-hour session window.
 */
export const TEMPLATES = {
  welcome: (hotel: string) =>
    `Welcome to MEDI LINK! 👋 You're booking from ${hotel}. Please reply with your full name.`,

  askType: (name: string) =>
    `Thanks ${name}! What type of appointment do you need?\n` +
    `1️⃣ House Call (doctor visits you)\n` +
    `2️⃣ Video Consultation\n` +
    `3️⃣ Visit Medical Center\n` +
    `Reply with 1, 2, or 3.`,

  askDate: () =>
    `Great! What date works best? Reply in DD/MM/YYYY format (e.g., 25/04/2026). Date must be at least tomorrow.`,

  showSlots: (date: string, slots: { num: number; time: string; doctor: string }[]) =>
    `Available slots for ${date}:\n` +
    slots.map((s) => `${s.num}️⃣ ${s.time} — Dr. ${s.doctor}`).join('\n') +
    `\nReply with the number to select.`,

  askTimeOfDay: () =>
    `What time? Reply: 1=Morning, 2=Afternoon, 3=Evening`,

  confirmBooking: (details: {
    name: string;
    type: string;
    date: string;
    time: string;
    price: string;
  }) =>
    `Please confirm:\n` +
    `👤 ${details.name}\n` +
    `🏥 ${details.type}\n` +
    `📅 ${details.date} at ${details.time}\n` +
    `💰 ${details.price}\n` +
    `Reply YES to confirm or NO to cancel.`,

  bookingConfirmed: (ref: string, link: string) =>
    `✅ Booking confirmed! Reference: ${ref}\n` +
    `Complete payment here: ${link}\n` +
    `You'll get reminders before your appointment.`,

  bookingCancelled: (code: string) =>
    `Booking cancelled. Reply with BOOK_${code} to start again.`,

  paymentReceived: (ref: string) =>
    `✅ Payment received for booking ${ref}. You'll get reminders before your appointment.`,

  reminder2hr: (date: string, time: string) =>
    `⏰ Reminder: Your MEDI LINK appointment is in 2 hours, on ${date} at ${time}.`,

  videoJoinLink: (link: string) =>
    `📹 Your video consultation starts in 10 minutes. Join here: ${link}`,

  diagnosisReady: (link: string) =>
    `📋 Your consultation summary is ready. Download: ${link}`,

  rescheduled: (oldDate: string, newDate: string, reason: string) =>
    `📅 Your appointment has been rescheduled from ${oldDate} to ${newDate}.\nReason: ${reason}`,

  cancelled: (reason: string) =>
    `❌ Your appointment has been cancelled. Reason: ${reason}`,

  doctorAssigned: (
    patient: string,
    date: string,
    time: string,
    address: string,
  ) =>
    `New house call: ${patient} on ${date} at ${time}. Address: ${address}`,

  invalidInput: () =>
    `Sorry, I didn't understand that. Please try again or type CANCEL to start over.`,

  noSlotsAvailable: (date: string) =>
    `Sorry, there are no available slots for ${date}. Please try another date.`,

  invalidDate: () =>
    `Please enter a valid date in DD/MM/YYYY format. The date must be between tomorrow and 30 days from now.`,
};
