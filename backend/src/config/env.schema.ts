import { z } from 'zod';

export const envSchema = z.object({
  // ----------------
  // Application
  // ----------------
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('api/v1'),

  // ----------------
  // Database (PostgreSQL)
  // ----------------
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),

  // ----------------
  // Redis Cache
  // ----------------
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TLS: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // ----------------
  // JWT Authentication
  // ----------------
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // ----------------
  // Email (SMTP)
  // ----------------
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_SECURE: z.string().optional(),
  EMAIL_USER: z.string(),
  EMAIL_PASSWORD: z.string(),
  EMAIL_FROM: z.string().email(),

  // ----------------
  // File Storage
  // ----------------
  STORAGE_TYPE: z.enum(['local', 's3', 'cloudinary']).default('local'),
  STORAGE_PATH: z.string().default('./uploads'),
  
  // AWS S3
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ----------------
  // Rate Limiting
  // ----------------
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // ----------------
  // CORS
  // ----------------
  CORS_ORIGIN: z.string().default('http://localhost:3001,http://localhost:19006'),
  CORS_CREDENTIALS: z.string().default('true'),

  // ----------------
  // Frontend URLs
  // ----------------
  CUSTOMER_WEB_URL: z.string().default('http://localhost:3001'),
  CUSTOMER_APP_URL: z.string().default('exp://localhost:19000'),
  VENDOR_APP_URL: z.string().default('exp://localhost:19001'),
  RIDER_APP_URL: z.string().default('exp://localhost:19002'),

  // ----------------
  // Backend URL
  // ----------------
  BACKEND_URL: z.string().default('http://localhost:3000'),

  // ----------------
  // Payment Gateways
  // ----------------
  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  
  // Flutterwave
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_PUBLIC_KEY: z.string().optional(),
  
  // Monnify
  MONNIFY_BASE_URL: z.string().default('https://sandbox.monnify.com'),
  MONNIFY_API_KEY: z.string().optional(),
  MONNIFY_SECRET_KEY: z.string().optional(),
  MONNIFY_CONTRACT_CODE: z.string().optional(),

  // ----------------
  // Maps API
  // ----------------
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // ----------------
  // Push Notifications (Firebase Cloud Messaging)
  // ----------------
  FCM_SERVER_KEY: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  
  // Expo Push Notifications
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // ----------------
  // Logging
  // ----------------
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // ----------------
  // Bull Queue
  // ----------------
  QUEUE_HOST: z.string().optional(),
  QUEUE_PORT: z.coerce.number().optional(),
  QUEUE_PASSWORD: z.string().optional(),

  // ----------------
  // Health Check
  // ----------------
  HEALTH_CHECK_PATH: z.string().default('/health'),

  // ----------------
  // Legacy/Deprecated (Supabase - for reference)
  // ----------------
  SUPABASE_URL: z.string().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().optional(),
});
