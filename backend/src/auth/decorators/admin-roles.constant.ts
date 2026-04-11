import { UserRole } from '@prisma/client';

/**
 * All roles that are considered administrative.
 * Use this to grant admin-level access alongside other roles:
 *
 *   @Roles(UserRole.CUSTOMER, ...ADMIN_ROLES)
 */
export const ADMIN_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN_MANAGER,
  UserRole.ADMIN_SUPPORT,
  UserRole.ADMIN_FINANCE,
] as UserRole[];
