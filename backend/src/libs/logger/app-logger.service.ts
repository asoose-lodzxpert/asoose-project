import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: string, meta?: Record<string, any>) {
    this.logger.info(message, meta);
  }

  error(message: string, trace?: string, meta?: Record<string, any>) {
    this.logger.error(message, { trace, ...meta });
  }

  warn(message: string, meta?: Record<string, any>) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.logger.debug(message, meta);
  }
}
