import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

/**
 * MetricsModule
 *
 * Exposes a Prometheus-compatible `/metrics` endpoint (default-metrics from
 * prom-client are collected automatically: event-loop lag, GC, heap, etc.).
 *
 * Two custom metrics track every HTTP request:
 *   - http_requests_total        (counter)   — labelled by method / route / status_code
 *   - http_request_duration_seconds (histogram) — same labels, standard buckets
 *
 * HttpMetricsInterceptor is exported so it can be registered globally in
 * main.ts via `app.get(HttpMetricsInterceptor)` (DI-resolved instance).
 */
@Module({
  imports: [
    PrometheusModule.register({
      // Served at GET /metrics — excluded from the global 'api' prefix in
      // main.ts so Prometheus scrapers can hit it without a prefix.
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests processed',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    HttpMetricsInterceptor,
  ],
  exports: [HttpMetricsInterceptor],
})
export class MetricsModule {}
