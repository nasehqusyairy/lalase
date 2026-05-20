import multer from 'multer';
import express from 'express';
import session from '@server/config/session';
import vite from '@server/config/vite';
import { getPath } from '@server/lib/path';
import type { Middleware } from '@server/types';
import { STATIC_PATH } from '@server/config/constants';
import { APP_VERSION } from '@server/config/constants';

export default {
    staticMiddleware: ({ req, res, next }) =>
        express.static(getPath(STATIC_PATH), { index: false })(req, res, next),

    jsonParserMiddleware: ({ req, res, next }) =>
        express.json()(req, res, next),

    urlencodedParserMiddleware: ({ req, res, next }) =>
        express.urlencoded({ extended: true })(req, res, next),

    multipartParserMiddleware: ({ req, res, next }: any) =>
        multer().any()(req, res, next),

    serveMiddleware: async (arg) =>
        vite.runMiddleware(arg),

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
        const flashData = {
            errors: req.session?._errors || {},
            old: req.session?._old || {},
            success: req.session?._success || null,
            message: req.session?._message || null,
        };

        res.locals = { ...res.locals, flash: flashData };

        if (req.session) {
            delete req.session._errors;
            delete req.session._old;
            delete req.session._success;
            delete req.session._message;
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
            } as any;
        }

        next();
    },

    notFoundMiddleware: ({ res }) => res.status(404).render('error', { message: 'Halaman tidak ditemukan' }),
} satisfies Record<string, Middleware>;