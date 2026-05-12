import express, { type Application } from 'express';
// @ts-ignore
import edge from 'express-edge';
import { PORT, PRODUCTION } from '@server/config/app';
import { getPath } from '@server/helpers';

import {
    errorHandlers,
    globalMiddlewares,
    notFoundHandler,
    webMiddlewares,
    apiMiddlewares
} from './middleware';

import { web } from '@server/routes/web';
import { api } from '@server/routes/api';

export function createApp(): Application {
    const app = express();

    app.use(edge);
    app.set('views', getPath('views'));

    if (PRODUCTION) {
        app.use(express.static(getPath('dist/client'), { index: false }));
    } else {
        app.use(express.static(getPath('public'), { index: false }));
    }

    for (const middleware of globalMiddlewares) {
        app.use(middleware);
    }

    app.use('/api', ...apiMiddlewares, api);
    app.use(webMiddlewares, web);

    for (const errorHandler of errorHandlers) {
        app.use(errorHandler);
    }

    app.use(notFoundHandler);

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
