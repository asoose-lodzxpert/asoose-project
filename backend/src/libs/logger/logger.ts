import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

// ─── Optional Remote Transport (Logtail / Sentry / Datadog) ──────────────────
// Set LOGTAIL_TOKEN (Better Stack / Logtail) to forward all production logs to
// a remote aggregator.  Zero extra packages are required when the token is
// absent — the transport is simply skipped.
const remoteTransports: winston.transport[] = [];
if (isProd && process.env.LOGTAIL_TOKEN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Logtail } = require('@logtail/node');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LogtailTransport } = require('@logtail/winston');
    const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
    remoteTransports.push(new LogtailTransport(logtail));
  } catch {
    // @logtail/* not installed — remote transport silently disabled.
  }
}

export const appLogger = WinstonModule.createLogger({
  // LOG_LEVEL env var takes precedence; fall back to 'warn' in prod and 'debug' in dev.
  level: process.env.LOG_LEVEL ?? (isProd ? 'warn' : 'debug'),
  format: isProd
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta, null, 2)}`
            : '';
          return `[${timestamp}] [${level}]: ${message}${metaStr}`;
        }),
      ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
    ...remoteTransports,
  ],
});

// Injecting logger

// @Injectable()
// export class RideService {
//   constructor(private readonly logger: Logger) {}

//   async createRide() {
//     this.logger.log('Creating ride', {
//       context: 'RideService',
//     });
//   }
// }
