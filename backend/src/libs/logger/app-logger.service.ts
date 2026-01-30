import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly isProd: boolean;

  constructor() {
    this.isProd = process.env.NODE_ENV === 'production';
    this.logger = winston.createLogger({
      level: this.isProd ? 'error' : 'debug',
      format: this.isProd
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? ` ${JSON.stringify(meta, null, 2)}`
                : '';
              return `[${timestamp}] [${level}]: ${message}${metaStr}`;
            }),
          ),
      transports: [
        new winston.transports.Console({
          silent: process.env.NODE_ENV === 'test',
        }),
      ],
    });
  }

  log(message: string, meta?: Record<string, any>) {
    if (!this.isProd) {
      this.logger.info(message, meta);
    }
  }

  error(message: string, trace?: string, meta?: Record<string, any>) {
    this.logger.error(message, { trace, ...meta });
  }

  warn(message: string, meta?: Record<string, any>) {
    if (!this.isProd) {
      this.logger.warn(message, meta);
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    if (!this.isProd) {
      this.logger.debug(message, meta);
    }
  }
}
