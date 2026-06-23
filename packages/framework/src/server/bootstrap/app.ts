import express from 'express';
import { APP_PORT } from '@server/config/app';
import web from '@server/routes/web';
import api from '@server/routes/api';
import type { ErrorHandler, Middleware } from '@server/types';
import middlewareRegistry from './middleware';

function toRequestHandler(m: Middleware): express.RequestHandler {
    return (request, response, next) => m({ request, response, next });
}

function toErrorHandler(eh: ErrorHandler): express.ErrorRequestHandler {
    return ((err, request, response, next) => eh({ err, request, response, next }));
}

export function createApp(): express.Application {
    const app = express();

    // Apply global middlewares
    for (const middleware of middlewareRegistry.globalMiddlewares) {
        app.use(toRequestHandler(middleware));
    }

    // Set up API and web routes with their respective middlewares
    app.use('/api', ...middlewareRegistry.apiMiddlewares.map(toRequestHandler), api);
    app.use(...middlewareRegistry.webMiddlewares.map(toRequestHandler), web);

    // Apply error handlers
    for (const errorHandler of middlewareRegistry.errorHandlers) {
        app.use(toErrorHandler(errorHandler));
    }

    // Handle 404 Not Found
    app.use(toRequestHandler(middlewareRegistry.notFoundHandler));

    return app;
}

export async function startServer(app: express.Application): Promise<void> {
    return new Promise((resolve) => {
        app.listen(APP_PORT, () => {
            console.log(`🚀 Server running at http://localhost:${APP_PORT}`);
            resolve();
        });
    });
}
