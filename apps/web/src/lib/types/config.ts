export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export const CONFIG_KEYS = {
  SLOT_DURATION: 'teleconsult_slot_duration_minutes',
  PAYMENT_TIMEOUT: 'teleconsult_payment_timeout_minutes',
  HOUSE_CALL_PAYMENT_REQUIRED: 'house_call_payment_required',
  MAX_RESCHEDULES: 'max_reschedules',
  RESCHEDULE_NOTICE_HOURS: 'reschedule_notice_hours',
  DEFAULT_CURRENCY: 'default_currency',
} as const;

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'LKR', label: 'LKR — Sri Lankan Rupee' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'INR', label: 'INR — Indian Rupee' },
] as const;
