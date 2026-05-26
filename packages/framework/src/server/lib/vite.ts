import fs from 'fs';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import type { MiddlewareArg, ViteConfig, ViteManifest, ViteOptions } from '@server/types';
import { getPath } from '@server/lib/path';
import { VITE_SSR, VITE_MANIFEST } from '@server/config/constants';

export class Vite {
    private config: ViteConfig;
    private vite?: ViteDevServer;
    private isProduction: boolean;
    private manifest: ViteManifest;

    constructor(options: ViteOptions) {
        this.isProduction = !options.debug;
        this.config = options.config;
        this.manifest = this.readManifest();
    }

    private readManifest(): ViteManifest {
        if (!this.isProduction) return {};

        const manifestPath = getPath(VITE_MANIFEST);

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Vite manifest not found at: ${manifestPath}. Did you run "vite build"?`);
        }

        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ViteManifest;
    }

    public resolveAssets() {
        if (!this.isProduction) {
            return {
                css: [],
                scripts: ['src/client/app.tsx']
            };
        }

        const entry = this.manifest['src/client/app.tsx'];

        if (!entry) {
            throw new Error('Entry point not found in Vite manifest.');
        }

        return {
            css: entry.css ?? [],
            scripts: [entry.file]
        };
    }

    public async runMiddleware({ res, req, next }: MiddlewareArg) {
        if (!this.isProduction) {
            if (!this.vite) {
                this.vite = await createViteServer(this.config);
            }
            return this.vite.middlewares(req, res, next);
        }
        next();
    }

    public async ssrRender(page: object): Promise<string> {
        const assets = this.resolveAssets();

        if (!this.isProduction) {
            if (!this.vite) {
                this.vite = await createViteServer(this.config);
            }
            const mod = await this.vite.ssrLoadModule(VITE_SSR);
            return mod.default(page, assets);
        }

        const mod = await import(getPath(VITE_SSR));
        return mod.default(page, assets);
    }

    public async transformHtml(url: string, html: string): Promise<string> {
        if (!this.isProduction) {
            if (!this.vite) {
                this.vite = await createViteServer(this.config);
            }
            return this.vite.transformIndexHtml(url, html);
        }

        return html;
    }
}

export const createVite = (options: ViteOptions) => new Vite(options);