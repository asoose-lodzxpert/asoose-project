import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request, Response } from 'express';

import { QUEUE_NAMES } from '../matching/queue/queue.constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({
  path: 'system/queues',
  version: '1',
})
export class BullBoardController {
  private static serverAdapter: ExpressAdapter;
  private readonly logger = new Logger(BullBoardController.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RIDE_MATCHING)
    private readonly rideMatchingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DELIVERY_MATCHING)
    private readonly deliveryMatchingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DRIVER_INACTIVITY)
    private readonly driverInactivityQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ASSIGNMENT_TIMEOUT)
    private readonly assignmentTimeoutQueue: Queue,
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {
    // Initialize Bull Board only once
    if (!BullBoardController.serverAdapter) {
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/api/v1/system/queues');

      createBullBoard({
        queues: [
          new BullMQAdapter(this.rideMatchingQueue),
          new BullMQAdapter(this.deliveryMatchingQueue),
          new BullMQAdapter(this.driverInactivityQueue),
          new BullMQAdapter(this.notificationQueue),
          new BullMQAdapter(this.assignmentTimeoutQueue),
          new BullMQAdapter(this.emailQueue),
        ],
        serverAdapter,
      });

      BullBoardController.serverAdapter = serverAdapter;
    }
  }

  @Get()
  serveBullBoardEmpty(@Req() req: Request, @Res() res: Response) {
    try {
      if (BullBoardController.serverAdapter) {
        const router = BullBoardController.serverAdapter.getRouter();
        return router(req, res);
      }
      res.status(500).send('Bull Board not initialized');
    } catch (error: any) {
      this.logger.error('Bull Board error', error?.stack);
      res.status(500).send(`Bull Board error: ${error?.message}`);
    }
  }

  @Get('/')
  serveBullBoardRoot(@Req() req: Request, @Res() res: Response) {
    try {
      if (BullBoardController.serverAdapter) {
        const router = BullBoardController.serverAdapter.getRouter();
        return router(req, res);
      }
      res.status(500).send('Bull Board not initialized');
    } catch (error: any) {
      this.logger.error('Bull Board error', error?.stack);
      res.status(500).send(`Bull Board error: ${error?.message}`);
    }
  }

  @Get('*')
  serveBullBoard(@Req() req: Request, @Res() res: Response) {
    try {
      if (BullBoardController.serverAdapter) {
        const router = BullBoardController.serverAdapter.getRouter();
        return router(req, res);
      }
      res.status(500).send('Bull Board not initialized');
    } catch (error: any) {
      this.logger.error('Bull Board error', error?.stack);
      res.status(500).send(`Bull Board error: ${error?.message}`);
    }
  }
}
