import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : undefined;
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? (payload as { message: string | string[] }).message
        : 'Internal server error';
    response.status(status).json({
      statusCode: status,
      error: isHttp
        ? typeof payload === 'object' && payload && 'error' in payload
          ? (payload as { error: string }).error
          : exception.name
        : 'InternalServerError',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
