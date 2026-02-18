import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  ValidationPipe,
  VersioningType,
  BadRequestException,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'dotenv/config';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`,
        );
        return new BadRequestException({
          message: 'Validation failed: ' + messages.join('; '),
          errors: messages,
        });
      },
    }),
  );
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Idempotency-Key',
      ],
    });
  } else {
    if (!process.env.CORS_ORIGIN) {
      throw new Error(
        'CORS_ORIGIN environment variable must be set in production',
      );
    }
    const allowedOrigins = process.env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Idempotency-Key',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
      maxAge: 86400,
    });
  }
  const port = process.env.PORT ?? 3000;

  // Setup Bull Board
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/api/v1/system/queues');

    // Get queues from DI container
    try {
      const rideMatchingQueue = app.get('BullQueue_ride-matching');
      const deliveryMatchingQueue = app.get('BullQueue_delivery-matching');
      const driverInactivityQueue = app.get('BullQueue_driver-inactivity');
      const notificationQueue = app.get('BullQueue_notification');
      const assignmentTimeoutQueue = app.get('BullQueue_assignment-timeout');
      const emailQueue = app.get('BullQueue_email');

      createBullBoard({
        queues: [
          new BullMQAdapter(rideMatchingQueue),
          new BullMQAdapter(deliveryMatchingQueue),
          new BullMQAdapter(driverInactivityQueue),
          new BullMQAdapter(notificationQueue),
          new BullMQAdapter(assignmentTimeoutQueue),
          new BullMQAdapter(emailQueue),
        ],
        serverAdapter,
      });

      app.use('/api/v1/system/queues', serverAdapter.getRouter());
      appLogger.log('Bull Board initialized at /api/v1/system/queues', {
        context: 'Main',
      });
    } catch (error: any) {
      appLogger.warn('Could not initialize Bull Board: ' + error?.message, {
        context: 'Main',
      });
    }
  } catch (error: any) {
    appLogger.warn('Bull Board setup error: ' + error?.message, {
      context: 'Main',
    });
  }

  await app.listen(port, '0.0.0.0');

  appLogger.log(`Backend started on port ${port}`, {
    context: 'Main',
  });
}

bootstrap();
