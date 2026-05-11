import { readFileSync } from 'fs';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { PRODUCTION, APP_NAME, runtimePath } from '@server/core/config';
import { setVite } from './serve-middleware.js';
import type { Middleware } from '@server/types';

let vite: ViteDevServer | undefined;

export default (async ({ req, res, next }) => {
    if (!PRODUCTION && !vite) {
        vite = await createViteServer({
            server: {
                middlewareMode: true,
                hmr: { port: 24678 },
            },
            appType: 'custom',
        });
        setVite(vite);
    }

    res.view = async (component: string, props: any, title = APP_NAME) => {
        try {
            const url = req.originalUrl;
            const page = {
                component,
                props: props ?? {},   // pastikan props tidak undefined
                url,
                version: null,
            };

            // Inertia AJAX request — kembalikan JSON
            if (req.headers['x-inertia']) {
                res.setHeader('X-Inertia', 'true');
                res.setHeader('Vary', 'Accept');
                return res.json(page);
            }

            // Kunjungan pertama — render HTML shell kosong saja (CSR)
            let viteHead = '';

            if (!PRODUCTION && vite) {
                // Inject Vite HMR client
                viteHead = await vite.transformIndexHtml(url,
                    `<script type="module" src="/src/client/entry-client.tsx"></script>`
                );
            } else {
                // Di production, baca asset manifest dari index.html hasil build
                viteHead = readFileSync(runtimePath('dist/client/index.html'), 'utf-8')
                    .match(/<head>([\s\S]*?)<\/head>/)?.[1]
                    ?.replace(/<title>.*?<\/title>/, '') ?? '';
            }

            res.render('app', {
                appHtml: '',   // Kosong — React akan hydrate/mount di client
                page,
                title,
                viteHead,
            });
        } catch (e: any) {
            next(e);
        }
    };

    next();
}) as Middleware;