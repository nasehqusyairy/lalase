import type { Middleware } from '@server/types';

/**
 * 303 Redirect Middleware
 * 
 * This middleware overrides res.redirect() to ensure that POST/PUT/PATCH/DELETE requests
 * from Inertia clients receive a 303 status code (See Other) instead of 302.
 * 
 * Inertia.js requires 303 status for proper redirect handling on non-GET requests.
 */
export default (({ req, res, next }) => {
    const originalRedirect = res.redirect.bind(res);

    res.redirect = (statusOrUrl: number | string, url?: string) => {
        // Determine status code and URL
        let status: number;
        let redirectUrl: string;

        if (typeof statusOrUrl === 'number') {
            status = statusOrUrl;
            redirectUrl = url || '/';
        } else {
            redirectUrl = statusOrUrl;
            // Default to 302, will be changed to 303 for Inertia POST requests
            status = 302;
        }

        // Check if this is an Inertia request with non-GET method
        const isInertia = req.headers['x-inertia'] === 'true';
        const isPostMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

        // For Inertia POST requests, force 303 status code
        if (isInertia && isPostMethod && status === 302) {
            status = 303;
        }

        return originalRedirect(status, redirectUrl);
    };

    next();
}) as Middleware;
