import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { AppLogger } from './app-logger.service';
import { Inject } from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: ctx.switchToHttp().getResponse().statusCode,
          duration: ms,
          correlationId: req.correlationId,
        });
      }),
    );
  }
}

// Logging in Queues & Workers

// Queues do not have HTTP context, so:

// @Process('send-welcome')
// async handle(job: Job) {
//   this.logger.log('Email job started', {
//     jobId: job.id,
//     correlationId: job.data.correlationId,
//   });
// }
