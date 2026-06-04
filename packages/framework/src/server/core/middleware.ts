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
    requestContextMiddleware: ({ req, res, next }) =>
        context.run({ req, res }, next),

    staticMiddleware: ({ req, res, next }) =>
        express.static(path.resolve(APP_STATIC), { index: false })(req, res, next),

    jsonParserMiddleware: ({ req, res, next }) =>
        express.json()(req, res, next),

    urlencodedParserMiddleware: ({ req, res, next }) =>
        express.urlencoded({ extended: true })(req, res, next),

    multipartParserMiddleware: ({ req, res, next }) =>
        multer().any()(req, res, next),

    serveMiddleware: async (arg) =>
        viteMiddleware(arg),

    sessionMiddleware: ({ req, res, next }) =>
        session(req, res, () => {
            if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
                if (req.session && req.session.cookie) {
                    req.session.cookie.secure = false;
                }
            }
            next();
        }),

    flashMiddleware: ({ req, res, next }) => {
        res.locals = { ...res.locals, flash: req.session.flash };
        if (req.session) {
            delete req.session.flash;
        }
        next();
    },
    inertiaMiddleware: async ({ req, res, next }) => {
        const requestVersion = req.headers['x-inertia-version'] as string | undefined;
        if (requestVersion && requestVersion !== APP_VERSION) {
            res.status(409);
            res.setHeader('X-Inertia-Version', APP_VERSION);
            return res.json({ error: 'Version mismatch', status: 409 });
        }
        next();
    },
    redirectMiddleware: async ({ req, res, next }) => {
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
            }
        }

        next();
    },

    notFoundMiddleware: ({ req, res }) => view('error', {
        status: 404,
        message: 'Halaman tidak ditemukan'
    })
} satisfies Record<string, Middleware>
