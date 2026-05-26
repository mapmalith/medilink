/**
 * BullMQ queue names. Centralised so processors and the scheduler stay in
 * sync, and so admin dashboards can list queues by iterating over this map.
 */
export const QUEUE_NAMES = {
  PAYMENT_TIMEOUT: 'payment-timeout',
  APPOINTMENT_REMINDER: 'appointment-reminder',
  VIDEO_ROOM_CREATION: 'video-room-creation',
  SLOT_GENERATION: 'slot-generation',
  INVOICE_GENERATION: 'invoice-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: QueueName[] = Object.values(QUEUE_NAMES);

export const SLOT_GENERATION_REPEAT_KEY = 'daily-slot-generation';
