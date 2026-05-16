import { Edge } from 'edge.js';
import type { Middleware } from '@server/types';
import { APP_NAME } from '@server/config/app';

export default (({ app, req, res, next }) => {
    app.engine(
        'edge',
        (filePath: string, options: object, callback: (err: Error | null, html?: string) => void): void => {
            const cache: boolean = app.settings['view cache'] || false;
            app.settings['view cache'] = cache;

            const edge = new Edge({ cache });

            edge.mount('default', app.settings.views);

            edge.global('_title', APP_NAME);

            try {
                const html = edge.renderSync(filePath, options);
                callback(null, html);
            } catch (error) {
                callback(error as any);
            }
        }
    );

    app.set('view engine', 'edge');

    next();
}) as Middleware