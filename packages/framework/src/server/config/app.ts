import express, { type Application } from 'express';
import { PORT } from '@server/config/constants';
import web from '@server/routes/web';
import api from '@server/routes/api';
import middlewareRegistry from './middleware';
import extensionRegistry from './extension';
import { toErrorHandler, toRequestHandler } from '@server/lib/middleware';

export function createApp(): Application {
    const app = express();

    // Apply extensions
    for (const extension of extensionRegistry) {
        extension(app);
    }

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

export async function startServer(app: Application): Promise<void> {
    return new Promise((resolve) => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
            resolve();
        });
    });
}
