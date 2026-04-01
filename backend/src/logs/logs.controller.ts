import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LogsService } from './logs.service';
import { CreateErrorLogDto } from './dto/create-error-log.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Logs')
@Controller({
  path: 'logs',
  version: '1',
})
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @ApiOperation({ summary: 'Log a client-side error from mobile/web app' })
  @Post('error')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // max 5 logs/min per IP
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async logError(@Body() createErrorLogDto: CreateErrorLogDto) {
    const log = await this.logsService.createErrorLog(createErrorLogDto);
    return {
      success: true,
      message: 'Error logged successfully',
      id: log?.id,
    };
  }
}
