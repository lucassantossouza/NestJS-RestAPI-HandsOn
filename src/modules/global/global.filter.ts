/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';
import { CannotCreateEntityIdMapError } from 'typeorm/error/CannotCreateEntityIdMapError';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class GlobalFilter<T> extends LoggerService implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let responseLogger = {};

    let message =
      (exception as any)?.message?.message ||
      (exception as any)?.message ||
      'Internal server error';
    let code = (exception as any)?.code || 'HttpException';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (exception.constructor) {
      case HttpException:
        status = (exception as any).getStatus();
        break;
      case QueryFailedError:
        status = HttpStatus.BAD_REQUEST;
        message = (exception as QueryFailedError).message;
        code = (exception as any).code;
        this.error(message, false);
        break;
      case EntityNotFoundError:
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = (exception as EntityNotFoundError).message;
        code = (exception as any).code;
        this.error(message, false);
        break;
      case CannotCreateEntityIdMapError:
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = (exception as CannotCreateEntityIdMapError).message;
        code = (exception as any).code;
        this.error(message, false);
        break;
      case TypeError:
        status = (exception as any).status || HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Erro interno do servidor: ${
          (exception as TypeError).message
        }`;
        code = (exception as any).code;
        this.error(message, false);
        break;
      default:
        status = (exception as any).status || HttpStatus.INTERNAL_SERVER_ERROR;
        if (status === HttpStatus.INTERNAL_SERVER_ERROR)
          this.error(message, false);
        break;
    }

    /prd|prod/.test(process.env.NODE_ENV)
      ? (message =
          'Serviço indisponível no momento, nosso time já foi notificado e está trabalhando para resolver o problema. Por favor, tente novamente mais tarde.')
      : (responseLogger = {
          ...this.response,
          message: this.response?.['message'] || message,
        });

    response.status(status).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      method: request.method,
      ...((exception as any)?.response?.stack || {}),
    });
  }
}
