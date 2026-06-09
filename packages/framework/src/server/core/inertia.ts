import { APP_VERSION } from '@server/config/app';
import { context } from './context';
import { ssrRender, transformHtml } from './vite';

function resolveProp(value: unknown): unknown {
    return typeof value === 'function' ? value() : value;
}

function resolveProps(props: Record<string, unknown>): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        resolved[key] = resolveProp(value);
    }
    return resolved;
}

function getMergedProps(localProps: Record<string, unknown>): Record<string, unknown> {
    const { req, res } = context.getStore()!;
    const { cookie, ...sessionData } = req.session as any;

    const sharedData: Record<string, unknown> = res.locals.inertiaSharedData || {};

    const baseData: Record<string, unknown> = {
        ...sharedData,
        ...sessionData
    };

    const { errors, ...flash } = res.locals.flash || { errors: {} };

    baseData.errors = errors
    baseData.flash = flash

    return lazyProps({
        ...baseData,
        ...localProps
    });
}

function lazyProps<T extends Record<string, unknown>>(props: T): Partial<T> {
    const store = context.getStore();
    if (!store) {
        return props;
    }

    const { req } = store;
    const isPartialReload = req.headers['x-inertia-partial'] === 'true';
    const partialDataHeader = req.headers['x-inertia-partial-data'] as string | undefined;

    if (!isPartialReload || !partialDataHeader) {
        return resolveProps(props) as T;
    }

    const requestedProps = partialDataHeader.split(',').map((s: string) => s.trim());
    const filtered: Record<string, unknown> = {};

    for (const key of requestedProps) {
        if (props[key] !== undefined) {
            const value = props[key];
            filtered[key] = resolveProp(value);
        }
    }

    return filtered as Partial<T>;
}

export async function view(component: string, props?: Record<string, unknown>) {
    const { req, res } = context.getStore()!;
    const url = req.originalUrl;
    const mergedProps = getMergedProps(props ?? {});

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

    let html = '';
    try {
        html = await ssrRender(page);
    } catch (err) {
        console.error('SSR Error:', err);
    }

    html = await transformHtml(url, html);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
}

export function shareProps(data: Record<string, unknown>) {
    const { res } = context.getStore()!;
    res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
    Object.assign(res.locals.inertiaSharedData, data);
}

export function redirect(url: string) {
    const { req, res } = context.getStore()!;

    if (!req.headers['x-inertia']) {
        res.redirect(url);
        return res;
    }

    res.status(409);
    res.setHeader('X-Inertia-Location', url);
    return res.json({ error: 'Inertia location redirect', status: 409 });
}

export function back() {
    const { req, res } = context.getStore()!;
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

    res.status(303).redirect(redirectUrl);
    return res;
}