import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PrismaClient from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('database.url'),
        },
      },
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    let attempts = 0;
    while (attempts < 5) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        break;
      } catch (e) {
        attempts++;
        this.logger.error(`Database connection failed (attempt ${attempts})`);
        if (attempts >= 5) throw e;
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
