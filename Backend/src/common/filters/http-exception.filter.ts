import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Renders errors in the shape the dashboard already handles:
 *   `err.response.data.message`  - shown on login and password screens
 *   `err.response.data.errors`   - `{ field: ["msg"] }`, read by the add/edit forms
 *   `err.response.data.code`     - why a known account was turned away (GROUP_SUSPENDED, ...)
 *                                  or a booking refused (SLOT_TAKEN, ...)
 *   `err.response.data.details`  - what the code is about (the clashing branch, the stranded visits)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as Record<string, unknown> | string;

      if (typeof payload === 'string') {
        response.status(status).json({ message: payload });
        return;
      }

      const message = Array.isArray(payload.message)
        ? (payload.message as string[])[0]
        : (payload.message as string) ?? exception.message;

      response.status(status).json({
        message,
        ...(payload.errors ? { errors: payload.errors } : {}),
        ...(payload.code ? { code: payload.code } : {}),
        ...(payload.details ? { details: payload.details } : {}),
      });
      return;
    }

    this.logger.error(exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Something went wrong on the server' });
  }
}
