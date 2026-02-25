import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly counter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Only measure HTTP contexts (skip WebSocket frames etc.)
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.record(method, req, String(res.statusCode), start);
        },
        error: (err: any) => {
          this.record(method, req, String(err?.status ?? 500), start);
        },
      }),
    );
  }

  private record(
    method: string,
    req: any,
    statusCode: string,
    start: bigint,
  ): void {
    // Prefer the matched route pattern (/rides/:id) over raw url (/rides/123)
    // to keep cardinality low.
    const route: string = (req.route?.path as string) ?? req.url;
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = { method, route, status_code: statusCode };
    this.counter.inc(labels);
    this.histogram.observe(labels, durationSeconds);
  }
}
