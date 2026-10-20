import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Request } from 'express';
import { Connection } from 'mongoose';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '../../common/auth-user';
import { AccountsService } from '../../database/accounts.service';
import { AUDIT_ROUTES, AuditRoute } from './audit.routes';
import { AuditService } from './audit.service';

type Body = Record<string, unknown>;

/** What was sent, as the log keeps it: no passwords, long text cut short. */
function sanitize(body: Body): Body {
  return Object.fromEntries(
    Object.entries(body)
      .filter(([key]) => !/password/i.test(key))
      .map(([key, value]) => [key, typeof value === 'string' && value.length > 300 ? `${value.slice(0, 300)}…` : value]),
  );
}

const num = (value: unknown) => (typeof value === 'number' ? value : null);

/**
 * Logs every successful change (a POST by a signed-in account) to the
 * activity log: who, what (from AUDIT_ROUTES), what was sent and - for edits
 * and deletions - the record as it was. Sign-ins are logged by AuthService.
 * Failed requests change nothing, so they aren't logged.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly accounts: AccountsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const user: AuthUser | undefined = request['user'];
    if (request.method !== 'POST' || !user) return next.handle();

    const route = request.path.replace(/^\/api\//, '');
    const spec = AUDIT_ROUTES[route];
    const body: Body = { ...(request.body ?? {}) };
    const before = spec?.before ? await this.snapshot(spec, body) : null;

    return next.handle().pipe(
      tap((result) => {
        void this.write(request, user, route, spec, body, before, result);
      }),
    );
  }

  /** The record as it was, before the change. */
  private async snapshot(spec: AuditRoute, body: Body) {
    try {
      const filter = spec.before!.filter(body);
      if (!filter) return null;
      const doc = await this.connection.model(spec.before!.model).findOne(filter).lean();
      return doc ? spec.before!.pick(doc as Record<string, unknown>, body) : null;
    } catch {
      return null;
    }
  }

  private async write(
    request: Request,
    user: AuthUser,
    route: string,
    spec: AuditRoute | undefined,
    body: Body,
    before: Record<string, unknown> | null,
    result: unknown,
  ) {
    // The global TransformInterceptor may already have wrapped the result as { data }
    const value = (result && typeof result === 'object' && 'data' in result ? (result as { data: unknown }).data : result) as Body | null;
    const entityId = spec?.entityId ? spec.entityId(body, value) : num(body.id) ?? num(value?.id);
    const details = sanitize(body);
    const file = (request as Request & { file?: { originalname: string } }).file;
    if (file) details.file_name = Buffer.from(file.originalname, 'latin1').toString('utf8');

    await this.audit.record({
      group_id: user.group_id ?? (spec?.groupFromEntity ? entityId : null) ?? num(before?.group_id),
      clinic_id: user.role === 'receptionist' ? user.clinic_ids?.[0] ?? null : num(body.clinic_id) ?? num(before?.clinic_id),
      actor_role: user.role,
      actor_id: user.id,
      actor_name: await this.accounts.nameOf(user.role, user.id),
      action: spec?.action ?? 'action',
      category: typeof spec?.category === 'function' ? spec.category(body) : spec?.category ?? 'general',
      route,
      label: spec?.label ?? route,
      entity: spec?.entity ?? '',
      entity_id: entityId,
      details,
      before,
      ip: request.ip ?? '',
    });
  }
}
