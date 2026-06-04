import { APP_KEY } from "./app";

export const SESSION_SECRET = APP_KEY;
export const SESSION_NAME = process.env.SESSION_NAME || 'sid';
export const SESSION_LIFETIME = parseInt(process.env.SESSION_LIFETIME!) || 1000 * 60 * 60 * 24;
export const SESSION_SAME_SITE = process.env.SESSION_SAME_SITE || 'lax';
export const SESSION_RESAVE = process.env.SESSION_RESAVE === 'true' || false;
export const SESSION_SAVE_UNINITIALIZED = process.env.SESSION_SAVE_UNINITIALIZED === 'true' || false;
export const SESSION_HTTP_ONLY = process.env.SESSION_HTTP_ONLY === 'true' || true;