import { readFileSync } from 'fs';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { pathToFileURL } from 'url';
import { PRODUCTION, APP_NAME, runtimePath } from '@server/core/config';
import { setVite } from './serve-middleware.js';
import type { Middleware } from '@server/types';

let vite: ViteDevServer | undefined;

/**
 * View middleware - handles rendering React components to HTML
 * Supports both DEV (Vite SSR) and PROD (built bundle) modes
 */
export default (async ({ req, res, next }) => {
    // Initialize Vite in development mode
    if (!PRODUCTION && !vite) {
        vite = await createViteServer({
            server: {
                middlewareMode: true,
                hmr: { port: 24678 },
            },
            appType: 'custom',
        });

        // Share vite instance with serve middleware
        setVite(vite);
    }

    res.view = async (component: string, props: any, title = APP_NAME) => {
        try {
            // Check for custom navigation header
            if (req.headers['x-custom-navigation']) {
                return res.json({ component, props });
            }

            const url = req.originalUrl;
            let htmlRender: {
                appHtml: string;
                viteHead: string;
            };

            if (!PRODUCTION && vite) {
                // =========================
                // DEV (Vite middleware)
                // =========================
                const { render } = await vite.ssrLoadModule('/src/client/entry-server.tsx');
                const { html } = await render({ component, props });
                const viteHead = await vite.transformIndexHtml(url, '');

                htmlRender = {
                    appHtml: html,
                    viteHead,
                };
            } else {
                // =========================
                // PROD (built server bundle)
                // =========================
                const entryPath = pathToFileURL(
                    runtimePath('dist/ssr/entry-server.js')
                ).href;

                const { render } = await import(entryPath);
                const { html } = await render({ component, props });

                // 1. Read index.html from build
                const template = readFileSync(runtimePath('dist/client/index.html'), 'utf-8');

                // 2. Extract Asset Links (Script & CSS) from template
                const headAssets = template.match(/<head>([\s\S]*?)<\/head>/)?.[1] || '';
                const bodyAssets = template.match(/<body>([\s\S]*?)<\/body>/)?.[1] || '';

                // 3. Clean assets from SSR placeholder if any
                const viteHead = headAssets.replace('<title>Vite App</title>', '');
                const scripts = bodyAssets.replace('<div id="root"></div>', '');

                htmlRender = {
                    appHtml: html,
                    viteHead: viteHead + scripts,
                };
            }

            // Render the view using EJS
            res.render('app', {
                appHtml: htmlRender.appHtml,
                props,
                component,
                title,
                viteHead: htmlRender.viteHead,
            });
        } catch (e: any) {
            // Fix stacktrace in dev mode
            if (!PRODUCTION && vite) {
                vite.ssrFixStacktrace(e);
            }
            next(e);
        }
    };

    next();
}) as Middleware;

/**
 * Get Vite server instance (for external use)
 */
export function getVite(): ViteDevServer | undefined {
    return vite;
}
