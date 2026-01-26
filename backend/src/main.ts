import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Set global API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // 2. Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // 3. System-wide middleware and filters
  app.useLogger(appLogger);
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 4. Production-Ready CORS Configuration
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      // Explicitly allowing Idempotency-Key in dev as well to prevent issues
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Idempotency-Key',
      ],
    });
    appLogger.warn('⚠️  CORS allows ALL ORIGINS (development mode)');
  } else {
    // Validate CORS_ORIGIN is set in production
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
        // Allow requests with no origin (mobile apps, server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          appLogger.warn(`🚫 CORS blocked request from: ${origin}`);
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
        'Idempotency-Key', // ✅ FIX: Added Idempotency-Key to allowed headers
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Number'], // Add custom headers you expose
      maxAge: 86400, // Cache preflight for 24 hours
    });

    appLogger.log(`✅ CORS configured for: ${allowedOrigins.join(', ')}`);
  }

  // 5. Start the server
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  appLogger.log(
    `🚀 Backend running on: ${await app.getUrl()}/${process.env.API_PREFIX || 'api/v1'}`,
  );
}

bootstrap();
