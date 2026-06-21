import session, { type SessionOptions } from 'express-session';
import {
    SESSION_HTTP_ONLY,
    SESSION_LIFETIME,
    SESSION_NAME,
    SESSION_RESAVE,
    SESSION_SAME_SITE,
    SESSION_SAVE_UNINITIALIZED,
    SESSION_SECRET
} from '@server/config/session';
import type { RequestHandler } from 'express';
import { ConnectSessionKnexStore } from 'connect-session-knex';
import { APP_DEBUG } from '@server/config/app';
import { context } from './context';
import type e from 'express';
import vine from '@vinejs/vine';
import userModel from '@server/models/user.model';
import { back } from './inertia';
import pool from '@server/core/pool'
import { User } from '@server/models';

export default session({
    store: new ConnectSessionKnexStore({
        knex: pool.getKnex(),
        createTable: true,
        cleanupInterval: SESSION_LIFETIME
    }),
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

export async function saveSession(req: e.Request): Promise<void> {

    return new Promise((resolve, reject) => {
        req.session.save((err) => err ? reject(err) : resolve());
    });
}

export async function setSession(data: Record<string, unknown>) {
    const { req } = context.getStore()!;
    Object.assign(req.session, data);
    await saveSession(req);
}

export async function setFlash(data: Record<string, unknown>) {
    const { req } = context.getStore()!;
    req.session.flash = { ...req.session.flash, ...data };
    await saveSession(req);
}

type Credential = {
    email: string,
    password: string
}

type AuthData = {
    id: any,
}

export async function setAuth(credential: Credential & { user?: AuthData }) {

    let user: AuthData & Partial<Credential> | undefined = credential.user;

    if (!user) {
        const rule = vine.object({
            email: vine.string().email().minLength(1),
            password: vine.string().minLength(3),
        });

        const validated = await vine.create(rule).validate(credential);

        user = (await User.query().where({ email: validated.email }).first())!;

        if (!user || user.password !== validated.password) {
            const errors = { email: 'Wrong email or password' };
            await setFlash({ errors });
            return back()
        }
    }

    await setSession({ auth: { id: user.id } });
}

export function getAuth() {
    const { req } = context.getStore()!;
    return req.session.auth as AuthData | undefined;
}

export async function destroyAuth() {
    const { req } = context.getStore()!;
    delete req.session.auth;
    await saveSession(req);
}