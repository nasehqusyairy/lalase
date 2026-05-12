import express, {
    type Application,
    type ErrorRequestHandler,
    type RequestHandler,
} from 'express';
// @ts-ignore
import edge from 'express-edge';
import { PORT, PRODUCTION } from '@server/config/app';
import { getPath } from '@server/helpers';
import { web } from '@server/routes/web';
import { api } from '@server/routes/api';
import type { ErrorHandler, Middleware } from '@server/types';
import middlewareConfig from './middleware';

const toRequestHandler = (middleware: Middleware): RequestHandler => {
    return (req, res, next) => {
        middleware({ req, res, next });
    };
};

const toErrorHandler = (errorHandler: ErrorHandler): ErrorRequestHandler => {
    return (err, req, res, next) => {
        errorHandler({ err, req, res, next });
    };
};

export function createApp(): Application {
    const app = express();

    // Set up view engine and static files
    app.use(edge);
    app.set('views', getPath('views'));

    // Serve static files from the appropriate directory based on environment
    if (PRODUCTION) {
        app.use(express.static(getPath('dist/client'), { index: false }));
    } else {
        app.use(express.static(getPath('public'), { index: false }));
    }

    // Apply global middlewares
    for (const middleware of middlewareConfig.globalMiddlewares) {
        app.use(toRequestHandler(middleware));
    }

    // Set up API and web routes with their respective middlewares
    app.use('/api', ...middlewareConfig.apiMiddlewares.map(toRequestHandler), api);
    app.use(middlewareConfig.webMiddlewares.map(toRequestHandler), web);

    // Apply error handlers
    for (const errorHandler of middlewareConfig.errorHandlers) {
        app.use(toErrorHandler(errorHandler));
    }

    // Handle 404 Not Found
    app.use(toRequestHandler(middlewareConfig.notFoundHandler));

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
