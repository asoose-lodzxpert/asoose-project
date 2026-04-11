import { Module } from '@nestjs/common';
import { ScheduledRidesService } from './scheduled-rides.service';
import { ScheduledRidesController } from './scheduled-rides.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MapsModule } from '../maps/maps.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FareModule } from '../fare/fare.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduledRideAssignmentProcessor } from './jobs/assignment.processor';
import { ScheduledRideReminderProcessor } from './jobs/reminder.processor';
import { TripsModule } from '../users/trips/trips.module';

@Module({
  imports: [
    PrismaModule,
    MapsModule,
    NotificationsModule,
    FareModule,
    TripsModule,
    BullModule.registerQueue(
      { name: 'scheduled-ride-assignment' },
      { name: 'scheduled-ride-reminder' },
      { name: 'scheduled-ride-health' },
    ),
  ],
  controllers: [ScheduledRidesController],
  providers: [
    ScheduledRidesService,
    ScheduledRideAssignmentProcessor,
    ScheduledRideReminderProcessor,
  ],
  exports: [ScheduledRidesService],
})
export class ScheduledRidesModule {}
