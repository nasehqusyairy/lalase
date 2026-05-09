import session, { type SessionOptions } from 'express-session';
import type { RequestHandler } from 'express';
import { APP_SECRET } from '@server/core/config';

const options: SessionOptions = {
    secret: APP_SECRET,
    resave: false,
    saveUninitialized: false,
};

export const sessionMiddleware: RequestHandler = (req, res, next) => {
    session(options)(req, res, next);
};
