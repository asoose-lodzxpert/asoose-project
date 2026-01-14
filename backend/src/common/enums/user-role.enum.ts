// Runtime enum for UserRole - mirrors Prisma schema
// This enum is safe to use in decorators and at runtime

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_MANAGER = 'ADMIN_MANAGER',
  ADMIN_SUPPORT = 'ADMIN_SUPPORT',
  ADMIN_FINANCE = 'ADMIN_FINANCE',
}
