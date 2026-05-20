import type { Request, Response } from 'express';
import { APP_VERSION } from '@server/config/constants';

export class Inertia {
    public resolveProp(value: unknown): unknown {
        return typeof value === 'function' ? value() : value;
    }

    public resolveProps(props: Record<string, unknown>): Record<string, unknown> {
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
            resolved[key] = this.resolveProp(value);
        }
        return resolved;
    }

    public getMergedProps(
        localProps: Record<string, unknown>,
        req: Request,
        res: Response
    ): Record<string, unknown> {
        const sharedData: Record<string, unknown> = res.locals.inertiaSharedData || {};
        const flash = res.locals.flash || { errors: {}, old: {}, success: null, message: null };

        const baseData: Record<string, unknown> = {
            ...this.resolveProps(sharedData),
        };

        baseData.errors = flash.errors;
        baseData.flash = {
            success: flash.success,
            message: flash.message,
        };

        const partialData = req.headers['x-inertia-partial-data'] as string | undefined;
        const isPartialReload = req.headers['x-inertia-partial'] === 'true';

        if (isPartialReload && partialData) {
            const requestedProps = partialData.split(',').map((s: string) => s.trim());
            const filtered: Record<string, unknown> = {};

            for (const key of requestedProps) {
                if (localProps[key] !== undefined) {
                    filtered[key] = this.resolveProp(localProps[key]);
                }
                if (baseData[key] !== undefined) {
                    filtered[key] = this.resolveProp(baseData[key]);
                }
            }

            filtered.errors = baseData.errors;

            return filtered;
        }

        return { ...baseData, ...this.resolveProps(localProps) };
    }

    public async render(
        component: string,
        props: Record<string, unknown>,
        req: Request,
        res: Response
    ): Promise<Response> {
        if (!req) {
            throw new Error('Request object not available');
        }

        res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};

        const url = req.originalUrl;
        const mergedProps = this.getMergedProps(props ?? {}, req, res);

        const page = {
            component,
            props: mergedProps,
            url,
            version: APP_VERSION,
        };

        if (req.headers['x-inertia']) {
            res.setHeader('X-Inertia', 'true');
            res.setHeader('Vary', 'Accept');
            res.setHeader('X-Inertia-Version', APP_VERSION);
            return res.json(page);
        }

        let appHtml = '';
        try {
            appHtml = (await req.vite.ssrRender(page)).body;
        } catch (err) {
            console.error('SSR Error:', err);
            appHtml = '';
        }

        const head = await req.vite.tags(['src/client/entry-client.tsx']);

        res.render('app', {
            _inertia: {
                head,
                body: appHtml,
            },
        });
        return res;
    }

    public share(key: string, value: unknown, res: Response): Response {
        res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
        res.locals.inertiaSharedData[key] = value;
        return res;
    }

    public shareAll(data: Record<string, unknown>, res: Response): Response {
        res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
        Object.assign(res.locals.inertiaSharedData, data);
        return res;
    }

    public location(url: string, req: Request, res: Response): Response {
        if (!req) {
            throw new Error('Request object not available');
        }

        if (!req.headers['x-inertia']) {
            res.redirect(url);
            return res;
        }

        res.status(409);
        res.setHeader('X-Inertia-Location', url);
        res.json({ error: 'Inertia location redirect', status: 409 });
        return res;
    }

    public back(req: Request, res: Response): Response {
        if (!req) {
            throw new Error('Request object not available');
        }

        const fallbackUrl = req.headers['referer'] || req.headers['referrer'] || '/';

        let redirectUrl = '/';
        try {
            const parsedUrl = new URL(fallbackUrl as string, `${req.protocol}://${req.headers.host}`);
            redirectUrl = parsedUrl.pathname + parsedUrl.search;
        } catch {
            if (typeof fallbackUrl === 'string' && fallbackUrl.startsWith('/')) {
                redirectUrl = fallbackUrl;
            }
        }

        res.status(303);
        res.redirect(redirectUrl);
        return res;
    }
}
