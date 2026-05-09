import express, { type RequestHandler } from 'express';
import { PRODUCTION, runtimePath } from '@server/core/config';
import type { ViteDevServer } from 'vite';

let viteInstance: ViteDevServer | undefined;

/**
 * Set Vite instance (called from view middleware)
 */
export function setVite(vite: ViteDevServer): void {
    viteInstance = vite;
}

/**
 * Get Vite instance
 */
export function getViteInstance(): ViteDevServer | undefined {
    return viteInstance;
}

/**
 * Serve middleware - handles Vite dev server or static files
 * Based on environment (DEV vs PROD)
 */
export const serveMiddleware: RequestHandler = async (req, res, next) => {
    if (!PRODUCTION) {
        // DEVELOPMENT: Use Vite dev middlewares
        const vite = getViteInstance();
        if (vite) {
            return vite.middlewares(req, res, next);
        }
    } else {
        // PRODUCTION: Serve static files
        const staticPath = runtimePath('dist/client');
        return express.static(staticPath)(req, res, next);
    }

    next();
};
