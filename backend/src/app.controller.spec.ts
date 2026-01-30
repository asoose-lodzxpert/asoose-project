import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    systemSetting: { findUnique: jest.fn() },
  };

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    connect: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'REDIS_CLIENT', useValue: mockRedisClient },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the health status object', () => {
      // The service returns an object, not a string
      expect(appController.getHello()).toEqual(
        expect.objectContaining({
          message: 'Backend is running ✅',
          name: 'ASOOSE Backend',
        }),
      );
    });
  });
});