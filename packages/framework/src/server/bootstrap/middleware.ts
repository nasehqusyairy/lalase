import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import type { ErrorHandler, Middleware } from '@server/types';
import defaultHandler from '@server/error-handlers/core/default-handler';
import sessionMiddleware from '@server/middlewares/core/session-middleware';
import flashMiddleware from '@server/middlewares/core/flash-middleware';
import viewMiddleware from '@server/middlewares/core/view-middleware';
import serveMiddleware from '@server/middlewares/core/serve-middleware';
import notFoundMiddleware from '@server/middlewares/core/not-found-middleware';
import requestMiddleware from '@server/middlewares/core/request-middleware';
import jsonParserMiddleware from '@server/middlewares/core/json-parser-middleware';
import urlencodedParserMiddleware from '@server/middlewares/core/urlencoded-parser-middleware';
import multipartParserMiddleware from '@server/middlewares/core/multipart-parser-middleware';

const toRequestHandler = (middleware: Middleware): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        middleware({ req, res, next });
    };
};

const toErrorHandler = (errorHandler: ErrorHandler): ErrorRequestHandler => {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        errorHandler({ err, req, res, next });
    };
};

export const globalMiddlewares: RequestHandler[] = ([
] as Middleware[]).map(toRequestHandler);

export const apiMiddlewares: RequestHandler[] = ([
] as Middleware[]).map(toRequestHandler);

export const webMiddlewares: RequestHandler[] = ([
    sessionMiddleware,
    jsonParserMiddleware,
    urlencodedParserMiddleware,
    multipartParserMiddleware,
    requestMiddleware,
    flashMiddleware,
    viewMiddleware,
    serveMiddleware
] as Middleware[]).map(toRequestHandler);

export const errorHandlers: ErrorRequestHandler[] = ([
    defaultHandler
] as ErrorHandler[]).map(toErrorHandler);

export const notFoundHandler: RequestHandler = toRequestHandler(notFoundMiddleware);
