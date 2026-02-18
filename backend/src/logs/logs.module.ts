import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { ErrorLog, ErrorLogSchema } from './schemas/error-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ErrorLog.name, schema: ErrorLogSchema },
    ]),
  ],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
