import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AccountsService } from '../../database/accounts.service';
import { TokenPayload } from '../auth-user';
import { IS_PUBLIC } from '../decorators/public.decorator';

/**
 * Applied globally; every route needs `Authorization: Bearer <token>` unless
 * marked @Public. The token is checked, then the account behind it is loaded:
 * a deleted account gets 401, a suspended group 403 with `code: GROUP_SUSPENDED`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly accounts: AccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Unauthenticated');
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired, please sign in again');
    }

    request['user'] = await this.accounts.load(payload);
    return true;
  }
}
