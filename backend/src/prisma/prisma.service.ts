import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  /**
   * Attempt to connect to the database with retries.
   * If all retries fail the server still starts — endpoints that need the DB
   * will fail gracefully at request time instead of killing the whole process.
   */
  async onModuleInit() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3_000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.connected = true;
        this.logger.log('Database connected successfully');
        return;
      } catch (error: any) {
        this.logger.error(
          `Database connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`,
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    this.logger.error(
      'All database connection attempts failed. ' +
        'Server will start, but DB-dependent endpoints will return errors. ' +
        'Check DATABASE_URL in your .env file and ensure the database is reachable.',
    );
  }

  /** Returns true if the initial connection succeeded. */
  isConnected(): boolean {
    return this.connected;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
