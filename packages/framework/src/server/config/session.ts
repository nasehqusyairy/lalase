import session, { type SessionOptions } from 'express-session';
import {
    APP_DEBUG,
    SESSION_HTTP_ONLY,
    SESSION_LIFETIME,
    SESSION_NAME,
    SESSION_RESAVE,
    SESSION_SAME_SITE,
    SESSION_SAVE_UNINITIALIZED,
    SESSION_SECRET
} from '@server/config/constants';
import type { RequestHandler } from 'express';
import { ConnectSessionKnexStore } from 'connect-session-knex';
import { db } from './database';

const store = new ConnectSessionKnexStore({
    knex: db(),
    createTable: true,
    cleanupInterval: SESSION_LIFETIME
});

export default session({
    store,
    name: SESSION_NAME,
    secret: SESSION_SECRET,
    resave: SESSION_RESAVE,
    saveUninitialized: SESSION_SAVE_UNINITIALIZED,
    cookie: {
        httpOnly: SESSION_HTTP_ONLY,
        secure: !APP_DEBUG,
        sameSite: SESSION_SAME_SITE,
        maxAge: SESSION_LIFETIME,
    },
} as SessionOptions) as RequestHandler