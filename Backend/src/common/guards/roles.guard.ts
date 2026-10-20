import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Access, AuthUser } from '../auth-user';
import { ROLES } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Access[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    const user: AuthUser | undefined = request['user'];

    // The platform owner sees every group but never changes anything inside one.
    // Enforced here rather than per route, so a write route that forgets to list
    // its roles still can't be used by the platform account.
    if (user?.role === 'admin' && request.method !== 'GET' && !roles?.includes('admin')) {
      throw new ForbiddenException('The platform account can view groups but not change them');
    }

    if (!roles?.length) return true;

    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('You are not allowed to perform this action');
    }
    return true;
  }
}
