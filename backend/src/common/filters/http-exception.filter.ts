import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Maps HTTP status codes to machine-readable error codes.
 * Controllers can also pass { code: 'ERR_MY_CODE' } inside their exception
 * response object to override the default code.
 */
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'ERR_BAD_REQUEST',
  401: 'ERR_UNAUTHORIZED',
  403: 'ERR_FORBIDDEN',
  404: 'ERR_NOT_FOUND',
  409: 'ERR_CONFLICT',
  422: 'ERR_UNPROCESSABLE',
  429: 'ERR_TOO_MANY_REQUESTS',
  500: 'ERR_INTERNAL',
  502: 'ERR_BAD_GATEWAY',
  503: 'ERR_SERVICE_UNAVAILABLE',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name); // Create Logger

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string = STATUS_CODE_MAP[status] ?? 'ERR_INTERNAL';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const resObj = res as Record<string, any>;
        message = resObj.message ?? message;
        // Allow controllers to supply a custom machine-readable code
        code = resObj.code ?? STATUS_CODE_MAP[status] ?? 'ERR_INTERNAL';
      }
    } else {
      this.logger.error(`Global Exception Filter: ${exception}`);
      if (exception instanceof Error) {
        this.logger.error(exception.stack);
        // Include actual error message in dev for debuggability
        if (process.env.NODE_ENV !== 'production') {
          message = exception.message || message;
        }
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      code,
      error: HttpStatus[status],
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
