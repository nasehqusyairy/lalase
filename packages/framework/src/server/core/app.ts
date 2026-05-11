import express, { type Application } from 'express';
// @ts-ignore
import edge from 'express-edge';
import { PORT, PRODUCTION, runtimePath } from './config';

// Middleware registry
import {
    errorHandlers,
    globalMiddlewares,
    notFoundHandler,
    webMiddlewares,
    apiMiddlewares
} from '@server/middlewares/autoloads';

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
    app.use(edge)
    app.set('views', runtimePath('views'));

    if (PRODUCTION) {
        app.use(express.static(runtimePath('dist/client'), { index: false }));
    } else {
        app.use(express.static(runtimePath('public'), { index: false }));
    }

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

    app.use(notFoundHandler);

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
