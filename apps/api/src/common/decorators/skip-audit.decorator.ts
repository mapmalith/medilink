import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * Mark a controller or handler so AuditInterceptor will not record an
 * AuditLog for the call (e.g. webhooks, health checks).
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
