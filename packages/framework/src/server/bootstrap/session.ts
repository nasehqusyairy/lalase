import session, { type SessionOptions } from 'express-session';
import { PRODUCTION } from '@server/config/app';
import type { RequestHandler } from 'express';
import {
    SESSION_HTTP_ONLY,
    SESSION_LIFETIME,
    SESSION_NAME,
    SESSION_RESAVE,
    SESSION_SAME_SITE,
    SESSION_SAVE_UNINITIALIZED,
    SESSION_SECRET
} from '@server/config/session';

export default session({
    name: SESSION_NAME,
    secret: SESSION_SECRET,
    resave: SESSION_RESAVE,
    saveUninitialized: SESSION_SAVE_UNINITIALIZED,
    cookie: {
        httpOnly: SESSION_HTTP_ONLY,
        secure: PRODUCTION,
        sameSite: SESSION_SAME_SITE,
        maxAge: SESSION_LIFETIME,
    },
} as SessionOptions) as RequestHandler;