import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

export const appLogger = WinstonModule.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
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
