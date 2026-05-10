import session, { type SessionOptions } from 'express-session';
import { APP_SECRET } from '@server/core/config';
import type { Middleware } from '@server/types';

const options: SessionOptions = {
    secret: APP_SECRET,
    resave: false,
    saveUninitialized: false,
};

export default (({ req, res, next }) => {
    session(options)(req, res, next);
}) as Middleware;
