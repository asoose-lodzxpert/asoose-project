import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const correlationId = req.headers['x-correlation-id'] ?? randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
