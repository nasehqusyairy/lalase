import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import type { ErrorHandler, Middleware } from '@server/types';
import defaultHandler from '@server/error-handlers/core/default-handler';
import sessionMiddleware from './core/session-middleware';
import flashMiddleware from './core/flash-middleware';
import viewMiddleware from './core/view-middleware';
import serveMiddleware from './core/serve-middleware';
import notFoundMiddleware from './core/not-found-middleware';
import requestMiddleware from './core/request-middleware';
import jsonParserMiddleware from './core/json-parser-middleware';
import urlencodedParserMiddleware from './core/urlencoded-parser-middleware';
import multipartParserMiddleware from './core/multipart-parser-middleware';

// ========================
// Middleware Transformers
// ========================

/**
 * Transform custom Middleware (ctx-based) to Express RequestHandler
 */
const toRequestHandler = (middleware: Middleware): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        middleware({ req, res, next });
    };
};

/**
 * Transform custom Middleware (ctx-based) to Express ErrorHandler
 */
const toErrorHandler = (errorHandler: ErrorHandler): ErrorRequestHandler => {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        errorHandler({ err, req, res, next });
    };
};

// ========================
// Middleware Array
// ========================

/**
 * Middleware registry - users can add their custom middlewares here
 * Users simply add their middleware handlers to this array
 */

export const globalMiddlewares: RequestHandler[] = ([
    // Your global middlewares can be added here
    //

] as Middleware[]).map(toRequestHandler);

export const apiMiddlewares: RequestHandler[] = ([
    // Your API middlewares can be added here
    //

] as Middleware[]).map(toRequestHandler);

export const webMiddlewares: RequestHandler[] = ([
    // Core middlewares
    sessionMiddleware,
    // Body parsers
    jsonParserMiddleware,
    urlencodedParserMiddleware,
    multipartParserMiddleware,

    requestMiddleware,

    // Optional middlewares
    flashMiddleware,
    viewMiddleware,
    serveMiddleware,

    // Your web middlewares can be added here
    //

] as Middleware[]).map(toRequestHandler);

export const errorHandlers: ErrorRequestHandler[] = ([
    defaultHandler,

] as ErrorHandler[]).map(toErrorHandler);

export const notFoundHandler: RequestHandler = toRequestHandler(notFoundMiddleware)
