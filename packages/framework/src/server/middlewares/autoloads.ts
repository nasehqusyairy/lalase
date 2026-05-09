import type { RequestHandler, ErrorRequestHandler } from 'express';

// Core middlewares
import { sessionMiddleware } from './core/session';
import { bodyParserMiddleware } from './core/body-parser';
import { requestMiddleware } from './core/request';
import { errorMiddleware } from './core/error';
import { notFoundMiddleware } from './core/not-found';

// Optional middlewares
import { flashMiddleware } from './core/flash';
import { viewMiddleware } from './core/view';
import { serveMiddleware } from './core/serve';

// ========================
// Middleware Array
// ========================

/**
 * Type for any Express middleware (regular or error handler)
 */
type ExpressMiddleware = RequestHandler | ErrorRequestHandler;

/**
 * Middleware registry - users can add their custom middlewares here
 * Users simply add their middleware handlers to this array
 */

const example: RequestHandler = (req, res, next) => {
    // Example middleware logic
    console.log('Example middleware executed');
    next();
}

export const globalMiddlewares: ExpressMiddleware[] = [
    // Your global middlewares can be added here
];
export const apilMiddlewares: ExpressMiddleware[] = [
    // Your api middlewares can be added here
    example,
];

export const webMiddlewares: ExpressMiddleware[] = [
    // Core middlewares
    sessionMiddleware,
    ...bodyParserMiddleware,
    requestMiddleware,

    // Optional middlewares
    flashMiddleware,
    viewMiddleware,
    serveMiddleware,

    // Your custom middlewares can be added here
    //
];

export const errorHandlers: ErrorRequestHandler[] = [
    errorMiddleware,
];

export const notFoundHandlers: RequestHandler[] = [
    notFoundMiddleware
];