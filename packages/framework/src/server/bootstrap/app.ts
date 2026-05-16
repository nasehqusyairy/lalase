import express, { type Application } from 'express';
import { PORT } from '@server/config/app';
import web from '@server/routes/web';
import api from '@server/routes/api';
import middlewareConfig from './middleware';
import { toErrorHandler, toRequestHandler } from '@server/helpers/middleware';

export function createApp(): Application {
    const app = express();

    // Apply global middlewares
    for (const middleware of middlewareConfig.globalMiddlewares) {
        app.use(toRequestHandler(middleware, app));
    }

    // Set up API and web routes with their respective middlewares
    app.use('/api', ...middlewareConfig.apiMiddlewares.map(m => toRequestHandler(m, app)), api(app));
    app.use(...middlewareConfig.webMiddlewares.map(m => toRequestHandler(m, app)), web(app));

    // Apply error handlers
    for (const errorHandler of middlewareConfig.errorHandlers) {
        app.use(toErrorHandler(errorHandler, app));
    }

    // Handle 404 Not Found
    app.use(toRequestHandler(middlewareConfig.notFoundHandler, app));

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
