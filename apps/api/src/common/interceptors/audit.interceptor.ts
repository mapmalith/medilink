import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_AUDIT_KEY } from '../decorators/skip-audit.decorator';

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const SKIP_PATH_PREFIXES = [
  '/auth',
  '/payments/webhook',
  '/whatsapp/webhook',
  '/health',
  '/admin/jobs',
];

const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
]);

interface AuthedRequest extends Request {
  user?: { id?: string };
}

/**
 * Global interceptor that logs successful POST/PATCH/PUT/DELETE calls to
 * the AuditLog table. Skips GET, auth, webhooks, health, and any handler
 * marked with @SkipAudit().
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return next.handle();

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const method = req.method?.toUpperCase();
    const action = ACTION_BY_METHOD[method ?? ''];
    if (!action) return next.handle();

    const url: string = req.originalUrl ?? req.url ?? '';
    const pathOnly = url.split('?')[0];
    if (this.isSkippedPath(pathOnly)) return next.handle();

    return next.handle().pipe(
      tap((response) => {
        this.write(req, pathOnly, action, response).catch((err) =>
          this.logger.error(`audit write failed: ${(err as Error).message}`),
        );
      }),
    );
  }

  private async write(
    req: AuthedRequest,
    pathOnly: string,
    action: string,
    response: unknown,
  ) {
    const entity = this.entityFromPath(pathOnly);
    const entityId = this.entityId(req, response);
    const userId = req.user?.id ?? null;

    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: this.detailsFor(req) satisfies Prisma.InputJsonValue,
        ipAddress: this.clientIp(req),
      },
    });
  }

  private isSkippedPath(pathOnly: string): boolean {
    // Strip the API prefix (`/api/v1`) so prefix list works regardless of mount.
    const noPrefix = pathOnly.replace(/^\/api\/v\d+/, '') || pathOnly;
    return SKIP_PATH_PREFIXES.some((p) => noPrefix.startsWith(p));
  }

  private entityFromPath(pathOnly: string): string {
    const noPrefix = pathOnly.replace(/^\/api\/v\d+/, '') || pathOnly;
    const segments = noPrefix.split('/').filter(Boolean);
    if (segments.length === 0) return 'Unknown';
    // For /admin/<topic>/... the meaningful entity is segment[1].
    const candidate =
      segments[0] === 'admin' && segments.length > 1
        ? segments[1]
        : segments[0];
    return this.toPascalSingular(candidate);
  }

  private entityId(req: AuthedRequest, response: unknown): string | null {
    const params = (req.params ?? {}) as Record<string, string | undefined>;
    if (params.id) return params.id;
    // POST creates: try to pull id from response body.
    if (
      response &&
      typeof response === 'object' &&
      'data' in (response as Record<string, unknown>)
    ) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === 'object' && 'id' in (data as Record<string, unknown>)) {
        const id = (data as { id?: unknown }).id;
        if (typeof id === 'string') return id;
      }
    }
    return null;
  }

  private detailsFor(req: AuthedRequest): Prisma.InputJsonValue {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    return {
      method: req.method,
      path: req.originalUrl ?? req.url ?? '',
      params: req.params ?? {},
      query: req.query ?? {},
      body: this.redact(body as Record<string, unknown>),
    } as Prisma.InputJsonValue;
  }

  private redact(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (REDACT_KEYS.has(k)) {
        out[k] = '[REDACTED]';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = this.redact(v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private clientIp(req: AuthedRequest): string | null {
    const fwd = req.headers?.['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
      return fwd.split(',')[0].trim();
    }
    if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
    return req.ip ?? null;
  }

  private toPascalSingular(seg: string): string {
    let s = seg;
    if (s.endsWith('ies')) s = s.slice(0, -3) + 'y';
    else if (s.endsWith('ses')) s = s.slice(0, -2);
    else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
    return s
      .split('-')
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('');
  }
}
