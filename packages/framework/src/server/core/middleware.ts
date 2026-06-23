import multer from 'multer';
import express from 'express';
import session from '@server/core/session';
import type { Middleware } from '@server/types';
import { APP_STATIC, APP_VERSION } from '@server/config/app';
import { context } from '@server/core/context';
import { view } from '@server/core/inertia';
import path from 'path';
import { viteMiddleware } from '@server/core/vite';

export default {
    requestContextMiddleware: ({ request, response, next }) =>
        context.run({ request, response }, next),

    staticMiddleware: ({ request, response, next }) =>
        express.static(path.resolve(APP_STATIC), { index: false })(request, response, next),

    jsonParserMiddleware: ({ request, response, next }) =>
        express.json()(request, response, next),

    urlencodedParserMiddleware: ({ request, response, next }) =>
        express.urlencoded({ extended: true })(request, response, next),

    multipartParserMiddleware: ({ request, response, next }) =>
        multer().any()(request, response, next),

    serveMiddleware: async (arg) =>
        viteMiddleware(arg),

    sessionMiddleware: ({ request, response, next }) =>
        session(request, response, () => {
            if (request.hostname === 'localhost' || request.hostname === '127.0.0.1') {
                if (request.session && request.session.cookie) {
                    request.session.cookie.secure = false;
                }
            }
            next();
        }),

    flashMiddleware: ({ request, response, next }) => {
        response.locals = { ...response.locals, flash: request.session.flash };
        if (request.session) {
            delete request.session.flash;
        }
        next();
    },
    inertiaMiddleware: async ({ request, response, next }) => {
        const requestVersion = request.headers['x-inertia-version'] as string | undefined;
        if (requestVersion && requestVersion !== APP_VERSION) {
            response.status(409);
            response.setHeader('X-Inertia-Version', APP_VERSION);
            return response.json({ error: 'Version mismatch', status: 409 });
        }
        next();
    },
    redirectMiddleware: async ({ request, response, next }) => {
        const isInertia = request.headers['x-inertia'] === 'true';
        const isPostMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

        if (isInertia && isPostMethod) {
            const originalRedirect = response.redirect.bind(response);
            response.redirect = function (statusOrUrl: number | string, url?: string) {
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
            }
        }

        next();
    },

    notFoundMiddleware: ({ request, response }) => view('error', {
        status: 404,
        message: 'Halaman tidak ditemukan'
    })
} satisfies Record<string, Middleware>
