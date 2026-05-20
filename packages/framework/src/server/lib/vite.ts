import fs from 'fs';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import type { MiddlewareArg, ViteManifest, ViteConfig, ViteOptions } from '@server/types';
import { getPath } from '@server/lib/path';
import { VITE_ENTRY_SERVER_BUILD_PATH, VITE_ENTRY_SERVER_PATH } from '@server/config/constants';

export class Vite {
    private manifest: ViteManifest;
    private config: ViteConfig;
    private vite?: ViteDevServer;
    private isProduction: boolean;

    /**
     * @param options Konfigurasi berbasis environment (Dev vs Prod)
     */
    constructor(options: ViteOptions) {
        this.isProduction = options.isProduction;
        this.config = options.config;
        this.manifest = this.readViteManifest(getPath(options.manifest));
    }

    public async runMiddleware({ res, req, next }: MiddlewareArg) {
        if (!this.isProduction) {
            if (!this.vite) {
                this.vite = await createViteServer(this.config)
            }
            return this.vite.middlewares(req, res, next);
        }
        next()
    }

    /**
     * Membaca manifest file (Internal / Private)
     */
    private readViteManifest(manifest: string): ViteManifest {
        if (this.isProduction) {
            if (!fs.existsSync(manifest)) {
                throw new Error(`Vite manifest not found at: ${manifest}. Did you run "vite build"?`);
            }
            return JSON.parse(fs.readFileSync(manifest, 'utf-8')) as ViteManifest;
        }
        return {}
    }

    /**
     * Membuat tag HTML berdasarkan ekstensi file
     */
    private generateAssetTag(file: string): string {
        if (file.endsWith('.css')) {
            return `<link rel="stylesheet" href="/${file}">`;
        }

        if (/\.(js|ts|tsx|jsx)$/.test(file)) {
            return `<script type="module" src="/${file}"></script>`;
        }

        return '';
    }

    /**
     * Method Utama untuk dipanggil di View/Middleware.
     * Secara otomatis mendeteksi apakah harus merender tag Dev atau Prod.
     */
    public async resolveTags(url: string, entries: string[]) {
        if (!this.isProduction) {
            return await this.resolveDevTags(url, entries);
        }
        return this.resolveProdTags(entries);
    }

    public async ssrRender(page: object) {
        if (!this.isProduction) {
            if (!this.vite) {
                this.vite = await createViteServer(this.config)
            }
            const mod = await this.vite.ssrLoadModule(VITE_ENTRY_SERVER_PATH);
            return mod.render(page);
        }

        const mod = await import(getPath(VITE_ENTRY_SERVER_BUILD_PATH));
        return mod.render(page);
    }

    /**
     * Mengurai asset tags untuk mode Production
     */
    private resolveProdTags(entries: string[]): string {
        if (!this.manifest) return '';

        const tags: string[] = [];
        const seen = new Set<string>();
        const manifest = this.manifest;

        const processEntry = (src: string): void => {
            const chunk = manifest[src];
            if (!chunk) return;

            // 1. CSS dari chunk ini
            chunk.css?.forEach((cssFile) => {
                if (!seen.has(cssFile)) {
                    seen.add(cssFile);
                    tags.push(`<link rel="stylesheet" href="/${cssFile}">`);
                }
            });

            // 2. Static imports rekursif
            chunk.imports?.forEach((imported) => {
                if (!seen.has(imported)) {
                    seen.add(imported);
                    processEntry(imported);
                }
            });

            // 3. File utama chunk
            if (!seen.has(chunk.file)) {
                seen.add(chunk.file);
                tags.push(this.generateAssetTag(chunk.file));
            }
        };

        entries.forEach(processEntry);
        return tags.join('\n');
    }

    /**
     * Mengurai asset tags untuk mode Development
     */
    private async resolveDevTags(url: string, entries: string[]): Promise<string> {
        if (!this.vite) {
            this.vite = await createViteServer(this.config);
        };

        const rawTags = entries
            .map((e) => `<script type="module" src="/${e}"></script>`)
            .join('\n');

        return this.vite.transformIndexHtml(url, rawTags);
    }
}

export const createVite = (options: ViteOptions) => new Vite(options);