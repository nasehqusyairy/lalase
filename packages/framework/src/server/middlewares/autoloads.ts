import type { Middleware } from '@server/types';

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
 * Middleware registry - users can add their custom middlewares here
 * Users simply add their middleware handlers to this array
 */

export const globalMiddlewares: Middleware[] = [
    // Your global middlewares can be added here
];
export const apiMiddlewares: Middleware[] = [
    // Your API middlewares can be added here
];

export const webMiddlewares: Middleware[] = [
    // Core middlewares
    sessionMiddleware,
    ...bodyParserMiddleware,
    requestMiddleware,

    // Optional middlewares
    flashMiddleware,
    viewMiddleware,
    serveMiddleware,

    // Your web middlewares can be added here
    //
];

export const errorHandlers: Middleware[] = [
    errorMiddleware,
];

export const notFoundHandlers: Middleware[] = [
    notFoundMiddleware
];
