import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Mongo's `_id` is an internal detail - the API identifies records by their
 * numeric `id`. Lean queries bypass the schema's toJSON transform, so the
 * stripping happens here instead, in one place for every response.
 */
function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(strip);
  }
  if (value instanceof Date || !(value !== null && typeof value === 'object')) {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== '_id' && key !== 'password' && key !== '__v')
    .map(([key, nested]) => [key, strip(nested)]);

  return Object.fromEntries(entries);
}

/** The dashboard reads every successful response as `res.data.data`. */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => ({ data: strip(data ?? null) })));
  }
}
