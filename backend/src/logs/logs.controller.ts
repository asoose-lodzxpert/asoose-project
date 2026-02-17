import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateErrorLogDto } from './dto/create-error-log.dto';

@Controller({
  path: 'logs',
  version: '1',
})
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('error')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async logError(@Body() createErrorLogDto: CreateErrorLogDto) {
    const log = await this.logsService.createErrorLog(createErrorLogDto);
    return {
      success: true,
      message: 'Error logged successfully',
      id: (log as any)._id?.toString() || (log as any).id,
    };
  }
}
