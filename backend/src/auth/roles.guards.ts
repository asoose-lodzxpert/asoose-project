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

    this.logger.log('=== RolesGuard ===');
    this.logger.log(`Required Roles: ${JSON.stringify(requiredRoles)}`);

    // If no roles are required, allow access
    if (!requiredRoles) {
      this.logger.log('No roles required, allowing access');
      return true;
    }

    // Get the user object (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    this.logger.log(`User object: ${JSON.stringify(user)}`);
    this.logger.log(`User role: ${user?.role}`);
    this.logger.log(`User role type: ${typeof user?.role}`);

    // Accept all roles - use enum values for comparison
    const validRoles = [
      UserRole.CUSTOMER,
      UserRole.VENDOR,
      UserRole.DRIVER,
      UserRole.RIDER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ];

    if (!validRoles.includes(user.role)) {
      this.logger.error(`Invalid role: ${user.role}`);
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    this.logger.log(`Has required role: ${hasRole}`);

    return hasRole;
  }
}
