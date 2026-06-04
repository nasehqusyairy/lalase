import fs from 'fs';
import {
    createServer,
    type AppType,
    type ViteDevServer
} from 'vite';
import type {
    MiddlewareArg,
    ViteConfig,
    ViteManifest
} from '@server/types';
import {
    VITE_SSR,
    VITE_MANIFEST,
    VITE_APP,
    VITE_MIDDLEWARE,
    VITE_PORT,
    VITE_TYPE,
} from '@server/config/vite';
import path from 'path';
import { APP_DEBUG } from '@server/config/app';

let vite: ViteDevServer;

async function createViteServerIfNotExists() {
    if (!vite) {
        vite = await createServer({
            server: {
                middlewareMode: VITE_MIDDLEWARE,
                hmr: {
                    port: VITE_PORT
                },
            },
            appType: VITE_TYPE as AppType,
        } as ViteConfig);
    }
}

function readManifest() {
    if (APP_DEBUG) return {};

    const manifestPath = path.resolve(VITE_MANIFEST);

    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Vite manifest not found at: ${manifestPath}. Did you run "vite build"?`);
    }

    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ViteManifest;
}

export function resolveAssets() {
    if (APP_DEBUG) {
        return {
            css: [],
            scripts: ['src/client/app.tsx']
        };
    }

    const entry = readManifest()[VITE_APP];

    if (!entry) {
        throw new Error('Entry point not found in Vite manifest.');
    }

    return {
        css: entry.css ?? [],
        scripts: [entry.file]
    };
}

export async function viteMiddleware({ res, req, next }: MiddlewareArg) {
    if (APP_DEBUG) {
        await createViteServerIfNotExists();
        return vite.middlewares(req, res, next);
    }
    next();
}

export async function ssrRender(page: object): Promise<string> {
    const assets = resolveAssets();

    if (APP_DEBUG) {
        await createViteServerIfNotExists();
        const mod = await vite.ssrLoadModule(VITE_SSR);
        return mod.default(page, assets);
    }

    const mod = await import(path.resolve(VITE_SSR));
    return mod.default(page, assets);
}

export async function transformHtml(url: string, html: string): Promise<string> {
    if (APP_DEBUG) {
        await createViteServerIfNotExists();
        return vite.transformIndexHtml(url, html);
    }

    return html;
}
