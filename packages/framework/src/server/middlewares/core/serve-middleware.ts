import { PRODUCTION } from '@server/core/config';
import type { ViteDevServer } from 'vite';
import type { Middleware } from '@server/types';

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
export default (async ({ req, res, next }) => {
    if (!PRODUCTION) {
        // DEVELOPMENT: Use Vite dev middlewares
        const vite = getViteInstance();
        if (vite) {
            return vite.middlewares(req, res, next);
        }
    }

    next();
}) as Middleware;
