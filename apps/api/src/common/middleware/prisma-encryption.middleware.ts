import { Prisma } from '@prisma/client';
import { EncryptionService } from '../services/encryption.service';

const PATIENT_FIELDS = ['passportNumber'] as const;
const MEDICAL_RECORD_FIELDS = ['diagnosis', 'notes'] as const;

const ENCRYPTED: Record<string, readonly string[]> = {
  Patient: PATIENT_FIELDS,
  MedicalRecord: MEDICAL_RECORD_FIELDS,
};

const WRITE_ACTIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
]);

const READ_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
]);

/**
 * Prisma middleware that transparently encrypts sensitive fields on write
 * and decrypts them on read. No-ops when EncryptionService is disabled
 * (FIELD_ENCRYPTION_KEY unset).
 */
export function buildEncryptionMiddleware(
  encryption: EncryptionService,
): Prisma.Middleware {
  return async (params, next) => {
    if (!encryption.isEnabled() || !params.model) {
      return next(params);
    }
    const fields = ENCRYPTED[params.model];
    if (!fields) {
      return next(params);
    }

    if (WRITE_ACTIONS.has(params.action)) {
      encryptArgs(params, fields, encryption);
    }

    const result = await next(params);

    if (READ_ACTIONS.has(params.action) || params.action === 'upsert') {
      decryptResult(result, fields, encryption);
    } else if (
      (params.action === 'create' || params.action === 'update') &&
      result &&
      typeof result === 'object'
    ) {
      decryptResult(result, fields, encryption);
    }

    return result;
  };
}

function encryptArgs(
  params: Prisma.MiddlewareParams,
  fields: readonly string[],
  enc: EncryptionService,
) {
  const args = params.args ?? {};
  if (params.action === 'createMany' && Array.isArray(args.data)) {
    for (const row of args.data) encryptRecord(row, fields, enc);
    return;
  }
  if (args.data) {
    encryptRecord(args.data, fields, enc);
  }
  if (params.action === 'upsert') {
    if (args.create) encryptRecord(args.create, fields, enc);
    if (args.update) encryptRecord(args.update, fields, enc);
  }
}

function encryptRecord(
  record: Record<string, unknown>,
  fields: readonly string[],
  enc: EncryptionService,
) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.length > 0) {
      record[field] = enc.encrypt(value);
    } else if (
      value &&
      typeof value === 'object' &&
      'set' in (value as Record<string, unknown>) &&
      typeof (value as { set: unknown }).set === 'string'
    ) {
      const wrapped = value as { set: string };
      record[field] = { set: enc.encrypt(wrapped.set) };
    }
  }
}

function decryptResult(
  result: unknown,
  fields: readonly string[],
  enc: EncryptionService,
) {
  if (!result) return;
  if (Array.isArray(result)) {
    for (const row of result) decryptRecord(row, fields, enc);
  } else {
    decryptRecord(result as Record<string, unknown>, fields, enc);
  }
}

function decryptRecord(
  record: Record<string, unknown> | null,
  fields: readonly string[],
  enc: EncryptionService,
) {
  if (!record || typeof record !== 'object') return;
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && enc.isCiphertext(value)) {
      record[field] = enc.decrypt(value);
    }
  }
}
