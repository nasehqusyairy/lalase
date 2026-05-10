import express, { type Application, type Router } from 'express';

import { PORT, runtimePath, APP_NAME } from './config';

// Middleware registry
import { errorHandlers, globalMiddlewares, notFoundHandlers, webMiddlewares, apiMiddlewares } from '@server/middlewares/autoloads';

// Routes
import { web } from '@server/routes/web';
import { api } from '@server/routes/api';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
    const app = express();

    // =========================
    // View Engine Configuration
    // =========================
    app.set('view engine', 'ejs');
    app.set('views', runtimePath('views'));

    // =========================
    // Apply Middlewares
    // =========================
    // Loop through middlewares array and apply each
    for (const middleware of globalMiddlewares) {
        app.use(middleware);
    }

    // =========================
    // Routes
    // =========================
    app.use('/api', ...apiMiddlewares, api);
    app.use(webMiddlewares, web);

    for (const errorHandler of errorHandlers) {
        app.use(errorHandler);
    }

    for (const notFoundHandler of notFoundHandlers) {
        app.use(notFoundHandler);
    }

    return app;
}

/**
 * Start the server
 */
export async function startServer(app: Application): Promise<void> {
    return new Promise((resolve) => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
            resolve();
        });
    });
}
