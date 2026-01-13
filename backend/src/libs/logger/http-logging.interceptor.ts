import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        console.log({
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
