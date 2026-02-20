import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorLog, ErrorLogDocument } from './schemas/error-log.schema';
import { CreateErrorLogDto } from './dto/create-error-log.dto';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectModel(ErrorLog.name)
    private errorLogModel: Model<ErrorLogDocument>,
  ) {}

  async createErrorLog(
    createErrorLogDto: CreateErrorLogDto,
  ): Promise<ErrorLogDocument | null> {
    try {
      const createdLog = new this.errorLogModel(createErrorLogDto);
      return await createdLog.save();
    } catch (err: any) {
      this.logger.warn(
        `[MongoDB] createErrorLog failed (non-fatal): ${err?.message}`,
      );
      return null;
    }
  }

  async findAll(): Promise<ErrorLog[]> {
    try {
      return await this.errorLogModel
        .find()
        .sort({ createdAt: -1 })
        .limit(100)
        .exec();
    } catch (err: any) {
      this.logger.warn(`[MongoDB] findAll failed (non-fatal): ${err?.message}`);
      return [];
    }
  }

  async findById(id: string): Promise<ErrorLog | null> {
    try {
      return await this.errorLogModel.findById(id).exec();
    } catch (err: any) {
      this.logger.warn(
        `[MongoDB] findById failed (non-fatal): ${err?.message}`,
      );
      return null;
    }
  }
}
