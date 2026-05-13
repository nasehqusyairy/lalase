import { readFileSync } from 'fs';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { PRODUCTION, APP_NAME } from '@server/config/app';
import type { Middleware } from '@server/types';
import { getPath } from '@server/helpers';
import { setVite } from './serve-middleware';

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

    res.inertia = {
        render: async (component: string, props: any, title = APP_NAME) => {
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

                // SSR: Pre-render React components on server
                let appHtml = '';

                if (!PRODUCTION && vite) {
                    // In dev mode, use dynamic import to load the SSR entry
                    try {
                        const mod = await vite.ssrLoadModule('src/client/entry-server');
                        appHtml = (await mod.render(page)).body
                    } catch (err) {
                        console.error('SSR Error:', err);
                        // Fallback to CSR if SSR fails
                        appHtml = '';
                    }
                } else {
                    // In production, import the pre-built SSR module
                    try {
                        const mod = await import(getPath('dist/ssr/entry-server.js'));
                        appHtml = (await mod.render(page)).body;
                    } catch (err) {
                        console.error('SSR Error:', err);
                        appHtml = '';
                    }
                }

                // Kunjungan pertama — render HTML dengan SSR
                let viteHead = '';

                if (!PRODUCTION && vite) {
                    // Inject Vite HMR client
                    viteHead = await vite.transformIndexHtml(url,
                        `<script type="module" src="/src/client/entry-client.tsx"></script>`
                    );
                } else {
                    // Di production, baca asset manifest dari .vite/manifest.json
                    const manifestPath = getPath('dist/client/.vite/manifest.json');
                    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

                    // Find entry point from manifest
                    const entryKey = Object.keys(manifest).find(
                        (key) => (manifest as any)[key].isEntry === true
                    );

                    if (!entryKey) {
                        viteHead = '';
                    } else {
                        const entry = (manifest as any)[entryKey];

                        // Get CSS from entry.css array and JS from entry.file
                        const cssFiles = entry.css || [];
                        const jsFile = entry.file;

                        const cssTags = cssFiles.map((file: string) =>
                            `<link rel="stylesheet" href="/${file}">`
                        ).join('\n');

                        const jsTags = jsFile
                            ? `<script type="module" src="/${jsFile}"></script>`
                            : '';

                        viteHead = `${cssTags}\n${jsTags}`;
                    }
                }

                res.render('app', {
                    appHtml,   // SSR rendered HTML
                    page,
                    title,
                    viteHead,
                });
            } catch (e: any) {
                next(e);
            }
        }
    };

    next();
}) as Middleware;
