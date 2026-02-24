import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Required for Paystack (and other gateway) webhook HMAC signature verification.
    // Provides req.rawBody as the exact byte-perfect request body before JSON parsing.
    // Provides req.rawBody as the exact byte-perfect request body before JSON parsing.
    rawBody: true,
  });

  app.use(helmet());
  app.use(compression());

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
        'x-idempotency-key',
        'ngrok-skip-browser-warning',
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
        'x-idempotency-key',
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

      // Protect Bull Board: only allow BULL_BOARD_ALLOWED_IPS in production,
      // or all traffic in development.
      const allowedIps = (process.env.BULL_BOARD_ALLOWED_IPS || '')
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);

      app.use(
        '/api/v1/system/queues',
        (req: any, res: any, next: any) => {
          if (process.env.NODE_ENV !== 'production') return next();
          const clientIp: string =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.ip ||
            '';
          if (allowedIps.length === 0 || allowedIps.includes(clientIp)) {
            return next();
          }
          return res.status(403).json({ message: 'Forbidden' });
        },
        serverAdapter.getRouter(),
      );
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

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Asoose API')
      .setDescription('Asoose platform API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);
    appLogger.log('Swagger docs available at /api/v1/docs', {
      context: 'Main',
    });
  }

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  appLogger.log(`Backend started on port ${port}`, {
    context: 'Main',
  });
}

process.on('unhandledRejection', (reason: unknown) => {
  appLogger.error('Unhandled Promise Rejection', {
    reason,
    context: 'Process',
  });
});

process.on('uncaughtException', (err: Error) => {
  appLogger.error('Uncaught Exception — process will exit', {
    error: err.message,
    stack: err.stack,
    context: 'Process',
  });
  process.exit(1);
});

bootstrap();
