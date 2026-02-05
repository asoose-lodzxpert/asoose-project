import { Test, TestingModule } from '@nestjs/testing';
import { PayoutsController } from '../../payouts/payouts.controller';
import { DisputesController } from '../../dispute/dispute.controller';
import { PayoutsService } from '../../payouts/payouts.service';
import { DisputesService } from '../../dispute/dispute.service';
import { UserRole } from '@prisma/client';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from 'src/auth/roles.guards';
import { Reflector } from '@nestjs/core';

// Mock Services
const mockPayoutsService = { getPendingPayouts: jest.fn() };
const mockDisputesService = { resolve: jest.fn() };

describe('Super Admin RBAC', () => {
  let payoutsController: PayoutsController;
  let disputesController: DisputesController;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayoutsController, DisputesController],
      providers: [
        { provide: PayoutsService, useValue: mockPayoutsService },
        { provide: DisputesService, useValue: mockDisputesService },
      ],
    }).compile();

    payoutsController = module.get<PayoutsController>(PayoutsController);
    disputesController = module.get<DisputesController>(DisputesController);
  });

  const mockContext = (role: UserRole) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'test-user', role } }),
      }),
      getHandler: () => {},
      getClass: () => PayoutsController, // or DisputesController
    }) as unknown as ExecutionContext;

  describe('PayoutsController', () => {
    it('should allow SUPER_ADMIN to approve payouts', () => {
      // Simulate NestJS Guard metadata logic manually for unit test or trust Integration setup
      const roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

      const canActivate = rolesGuard.canActivate(
        mockContext(UserRole.SUPER_ADMIN),
      );
      expect(canActivate).toBe(true);
    });

    it('should deny ADMIN_SUPPORT from accessing payouts', () => {
      const roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

      const canActivate = rolesGuard.canActivate(
        mockContext(UserRole.ADMIN_SUPPORT),
      );
      expect(canActivate).toBe(false);
    });
  });

  describe('DisputesController', () => {
    it('should allow ADMIN_SUPPORT to resolve disputes', () => {
      const roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN_SUPPORT];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

      const canActivate = rolesGuard.canActivate(
        mockContext(UserRole.ADMIN_SUPPORT),
      );
      expect(canActivate).toBe(true);
    });
  });
});
