import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorLog, ErrorLogDocument } from './schemas/error-log.schema';
import { CreateErrorLogDto } from './dto/create-error-log.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(ErrorLog.name)
    private errorLogModel: Model<ErrorLogDocument>,
  ) {}

  async createErrorLog(
    createErrorLogDto: CreateErrorLogDto,
  ): Promise<ErrorLogDocument> {
    const createdLog = new this.errorLogModel(createErrorLogDto);
    return createdLog.save();
  }

  async findAll(): Promise<ErrorLog[]> {
    return this.errorLogModel.find().sort({ createdAt: -1 }).limit(100).exec();
  }

  async findById(id: string): Promise<ErrorLog> {
    return this.errorLogModel.findById(id).exec();
  }
}
