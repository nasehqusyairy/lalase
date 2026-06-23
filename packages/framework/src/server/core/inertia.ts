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
    const { request, response } = context.getStore()!;
    const { cookie, ...sessionData } = request.session as any;

    const sharedData: Record<string, unknown> = response.locals.inertiaSharedData || {};

    const baseData: Record<string, unknown> = {
        ...sharedData,
        ...sessionData
    };

    const { errors, ...flash } = response.locals.flash || { errors: {} };

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

    const { request } = store;
    const isPartialReload = request.headers['x-inertia-partial'] === 'true';
    const partialDataHeader = request.headers['x-inertia-partial-data'] as string | undefined;

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
    const { request, response } = context.getStore()!;
    const url = request.originalUrl;
    const mergedProps = getMergedProps(props ?? {});

    const page = {
        component,
        props: mergedProps,
        url,
        version: APP_VERSION,
    };

    if (request.headers['x-inertia']) {
        response.setHeader('X-Inertia', 'true');
        response.setHeader('Vary', 'Accept');
        response.setHeader('X-Inertia-Version', APP_VERSION);
        return response.json(page);
    }

    let html = '';
    try {
        html = await ssrRender(page);
    } catch (err) {
        console.error('SSR Error:', err);
    }

    html = await transformHtml(url, html);
    response.setHeader('Content-Type', 'text/html');
    return response.send(html);
}

export function shareProps(data: Record<string, unknown>) {
    const { response } = context.getStore()!;
    response.locals.inertiaSharedData = response.locals.inertiaSharedData || {};
    Object.assign(response.locals.inertiaSharedData, data);
}

export function redirect(url: string) {
    const { request, response } = context.getStore()!;

    if (!request.headers['x-inertia']) {
        response.redirect(url);
        return response;
    }

    response.status(409);
    response.setHeader('X-Inertia-Location', url);
    return response.json({ error: 'Inertia location redirect', status: 409 });
}

export function back() {
    const { request, response } = context.getStore()!;
    const fallbackUrl = request.headers['referer'] || request.headers['referrer'] || '/';

    let redirectUrl = '/';
    try {
        const parsedUrl = new URL(fallbackUrl as string, `${request.protocol}://${request.headers.host}`);
        redirectUrl = parsedUrl.pathname + parsedUrl.search;
    } catch {
        if (typeof fallbackUrl === 'string' && fallbackUrl.startsWith('/')) {
            redirectUrl = fallbackUrl;
        }
    }

    response.status(303).redirect(redirectUrl);
    return response;
}
