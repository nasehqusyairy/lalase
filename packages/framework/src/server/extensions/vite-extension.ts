import fs from 'fs';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { PRODUCTION } from '@server/config/app';
import type { AppExtension } from "@server/types";
import { readViteManifest, resolveViteDevTags, resolveViteTags } from '@server/helpers/vite';
import { setVite } from '@server/middlewares/serve-middleware';
import { getPath } from '@server/helpers/path';

/*
|-------------------------------------------------------------------------------------------
| Singleton ViteDevServer
|-------------------------------------------------------------------------------------------
*/
let vite: ViteDevServer | undefined;

/*
|-------------------------------------------------------------------------------------------
| Vite Extension - Menambahkan vite ke req
|
| Tanggung jawab:
|   1. Inisialisasi ViteDevServer (dev only, singleton)
|   2. Expose `req.vite.tags(entries)` — digunakan oleh tag @vite() di edge-middleware
|   3. Expose `req.vite.ssrRender(page)`  — digunakan oleh inertia-middleware untuk SSR
|
| Keduanya abstrak terhadap env: caller tidak perlu tahu dev vs production.
|-------------------------------------------------------------------------------------------
*/
export default ((app) => {
    app.request.defineProperty('vite', function (req) {
        return {
            /*
            |--------------------------------------------------------------------------------------------
            | req.vite.tags(entries)
            |
            | Mengembalikan HTML tags (<script>, <link>) untuk entry points yang diberikan.
            |
            | Dev        → transformIndexHtml dari ViteDevServer (HMR client otomatis)
            | Production → resolve dari dist/client/.vite/manifest.json secara rekursif
            |--------------------------------------------------------------------------------------------
            */
            tags: async (entries: string[]): Promise<string> => {
                if (!PRODUCTION) {
                    if (!vite) {
                        vite = await createViteServer({
                            server: {
                                middlewareMode: true,
                                hmr: { port: 24678 },
                            },
                            appType: 'custom',
                        });
                        setVite(vite);
                    }
                    return resolveViteDevTags((req as any).originalUrl, entries, vite);
                }

                const manifestPath = getPath('dist/client/.vite/manifest.json');
                const manifest = readViteManifest(manifestPath);

                return resolveViteTags(entries, manifest);
            },

            /*
            |--------------------------------------------------------------------------------------------
            | req.vite.ssrRender(page)
            |
            | Menjalankan SSR render untuk page object Inertia.
            | Mengembalikan { body: string } — HTML hasil render React di server.
            |
            | Dev        → ssrLoadModule dari ViteDevServer (live transform, no cache)
            | Production → import pre-built dist/ssr/entry-server.js
            |--------------------------------------------------------------------------------------------
            */
            ssrRender: async (page: object): Promise<{ body: string }> => {
                if (!PRODUCTION) {
                    if (!vite) {
                        vite = await createViteServer({
                            server: {
                                middlewareMode: true,
                                hmr: { port: 24678 },
                            },
                            appType: 'custom',
                        });
                        setVite(vite);
                    }
                    const mod = await vite.ssrLoadModule('src/client/entry-server');
                    return mod.render(page);
                }

                const mod = await import(getPath('dist/ssr/entry-server.js'));
                return mod.render(page);
            },
        };
    });
}) as AppExtension;
