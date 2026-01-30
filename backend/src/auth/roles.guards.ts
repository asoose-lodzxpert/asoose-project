import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user object (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Accept all roles - use enum values for comparison
    const validRoles = [
      UserRole.CUSTOMER,
      UserRole.VENDOR,
      UserRole.DRIVER,
      UserRole.RIDER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      // 👇 ADD THESE MISSING ROLES
      UserRole.ADMIN_MANAGER,
      UserRole.ADMIN_SUPPORT,
      UserRole.ADMIN_FINANCE,
    ];

    if (!validRoles.includes(user.role)) {
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);

    return hasRole;
  }
}