import type { Middleware } from '@server/types';

export default (async ({ req, res, next }) => {
    const isInertia = req.headers['x-inertia'] === 'true';
    const isPostMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (isInertia && isPostMethod) {
        const originalRedirect = res.redirect.bind(res);
        res.redirect = function (statusOrUrl: number | string, url?: string) {
            let status: number;
            let redirectUrl: string;

            if (typeof statusOrUrl === 'number') {
                status = statusOrUrl;
                redirectUrl = url || '/';
            } else {
                redirectUrl = statusOrUrl;
                status = 302;
            }

            if (status === 302) status = 303;

            return originalRedirect(status, redirectUrl);
        } as any;
    }

    next();
}) as Middleware;