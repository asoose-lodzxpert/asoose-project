import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CorrelationMiddleware } from './libs/logger/correlation.middleware';
import { HttpLoggingInterceptor } from './libs/logger/http-logging.interceptor';
import { AppLogger } from './libs/logger/app-logger.service';
import { HttpMetricsInterceptor } from './metrics/http-metrics.interceptor';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ValidationPipe,
  VersioningType,
  BadRequestException,
  RequestMethod,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'dotenv/config';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Parse allowed origins once at startup (init)
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .replace(/^["']|["']$/g, '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: (origin, callback) => {
      // 1. Always allow if origin is missing (Mobile Apps/Servers)
      // 2. Always allow literal string "null" (Mobile Apps/Redirects)
      // 3. Always allow in development mode
      if (!origin || origin === 'null' || isDevelopment) {
        return callback(null, true);
      }

      // 4. Check against white-list in production
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      appLogger.warn(`CORS blocked origin: ${origin}`, { context: 'CORS' });
      return callback(null, false);
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

  app.use(
    helmet({
      crossOriginResourcePolicy: false, // Ensure images/uploads are accessible cross-origin
    }),
  );
  app.use(compression());

  const correlationMiddleware = new CorrelationMiddleware();
  app.use(correlationMiddleware.use.bind(correlationMiddleware));

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(app.get(AppLogger)),
    app.get(HttpMetricsInterceptor),
  );

  app.use('/metrics', (req: any, res: any, next: any) => {
    if (process.env.NODE_ENV !== 'production') return next();
    const allowedIps = (process.env.METRICS_ALLOWED_IPS || '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (allowedIps.length === 0) return next();
    const clientIp: string =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      '';
    if (allowedIps.includes(clientIp)) return next();
    return res.status(403).json({ message: 'Forbidden' });
  });

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

  const port = process.env.PORT ?? 3000;

  // Setup Bull Board
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/api/v1/system/queues');

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
        serverAdapter: serverAdapter as any,
      });

      const allowedBoardIps = (process.env.BULL_BOARD_ALLOWED_IPS || '')
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
          if (
            allowedBoardIps.length === 0 ||
            allowedBoardIps.includes(clientIp)
          ) {
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

  if (process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Asoose API')
      .setDescription('Asoose Lodzxpert Nig. Ltd API documentation')
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
