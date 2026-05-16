import { APP_VERSION } from '@server/config/app';
import type { Middleware } from '@server/types';

// Inertia shared data store
let sharedData: Record<string, any> = {};

export default (async ({ req, res, next }) => {
    // Asset Versioning: Check X-Inertia-Version header
    const requestVersion = req.headers['x-inertia-version'] as string | undefined;
    if (requestVersion && requestVersion !== APP_VERSION) {
        res.status(409);
        res.setHeader('X-Inertia-Version', APP_VERSION);
        return res.json({ error: 'Version mismatch', status: 409 });
    }

    // Helper: Lazy evaluation — eksekusi jika value adalah function
    const resolveProp = (value: any): any => {
        if (typeof value === 'function') {
            try {
                return value();
            } catch {
                return undefined;
            }
        }
        return value;
    };

    // Helper: Resolve semua props dengan lazy evaluation
    const resolveProps = (props: Record<string, any>): Record<string, any> => {
        const resolved: Record<string, any> = {};
        for (const [key, value] of Object.entries(props)) {
            resolved[key] = resolveProp(value);
        }
        return resolved;
    };

    // Helper: Merge props dengan shared data + partial reload support
    const getMergedProps = (localProps: Record<string, any>): Record<string, any> => {
        const sessionErrors = (req.session as any)?.errors || {};

        const baseData: Record<string, any> = {
            ...resolveProps(sharedData),
        };

        if (Object.keys(sessionErrors).length > 0) {
            baseData.errors = sessionErrors;
        }

        // Handle Partial Reload: X-Inertia-Partial-Data
        const partialData = req.headers['x-inertia-partial-data'] as string | undefined;
        const isPartialReload = req.headers['x-inertia-partial'] === 'true';

        if (isPartialReload && partialData) {
            const requestedProps = partialData.split(',').map((s) => s.trim());
            const filtered: Record<string, any> = {};
            for (const key of requestedProps) {
                if (localProps[key] !== undefined) {
                    filtered[key] = resolveProp(localProps[key]);
                }
                if (baseData[key] !== undefined) {
                    filtered[key] = resolveProp(baseData[key]);
                }
            }
            return filtered;
        }

        return { ...baseData, ...resolveProps(localProps) };
    };

    res.inertia = {
        render: async (component: string, props: any) => {
            try {
                const url = req.originalUrl;
                const mergedProps = getMergedProps(props ?? {});

                const page = {
                    component,
                    props: mergedProps,
                    url,
                    version: APP_VERSION,
                };

                // Inertia AJAX request — kembalikan JSON
                if (req.headers['x-inertia']) {
                    res.setHeader('X-Inertia', 'true');
                    res.setHeader('Vary', 'Accept');
                    res.setHeader('X-Inertia-Version', APP_VERSION);
                    return res.json(page);
                }

                // SSR: Pre-render React components on server via vite-middleware
                let appHtml = '';

                try {
                    appHtml = (await req.vite.ssrRender(page)).body;
                } catch (err) {
                    console.error('SSR Error:', err);
                    appHtml = '';
                }

                res.render('app', {
                    _inertia: {
                        head: await req.vite.tags(['src/client/entry-client.tsx']),
                        body: appHtml,  // dikonsumsi oleh tag @inertia()
                    }
                });
            } catch (e: any) {
                next(e);
            }
        },

        // Share global data yang akan disertakan di setiap Inertia response
        share: (key: string, value: any) => {
            Object.assign(sharedData, { [key]: value });
            return res;
        },

        // Share beberapa global data sekaligus
        shareAll: (data: Record<string, any>) => {
            Object.assign(sharedData, data);
            return res;
        },

        // Location redirect (hard redirect for Inertia)
        location: (url: string) => {
            res.status(409);
            res.setHeader('X-Inertia-Location', url);
            res.json({ error: 'Inertia location redirect', status: 409 });
            return res;
        },
    };

    next();
}) as Middleware;

// Export function untuk clear shared data (berguna untuk testing)
export const clearSharedData = () => {
    Object.keys(sharedData).forEach(key => delete sharedData[key]);
};