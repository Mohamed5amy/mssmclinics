import { SetMetadata } from '@nestjs/common';
import { Access } from '../auth-user';

export const ROLES = 'roles';

/** The roles a route is for. Without it a route is open to every signed-in account (reads, mostly). */
export const Roles = (...roles: Access[]) => SetMetadata(ROLES, roles);
