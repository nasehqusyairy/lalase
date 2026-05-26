export const APP_NAME = process.env.npm_package_name || 'Lalase Framework';
export const APP_VERSION = process.env.npm_package_version || '1.0.0';
export const APP_KEY = process.env.APP_KEY || 'secret-key';
export const APP_DEBUG = process.env.APP_DEBUG === 'true';
export const APP_PORT = parseInt(process.env.APP_PORT!) || 5173;
export const APP_STATIC = APP_DEBUG ? 'public' : 'dist/client';

export const DB_CLIENT = process.env.DB_CLIENT || 'mysql2';
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = parseInt(process.env.DB_PORT!) || 3306;
export const DB_USERNAME = process.env.DB_USERNAME || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'lalase';

export const SESSION_SECRET = APP_KEY;
export const SESSION_NAME = process.env.SESSION_NAME || 'sid';
export const SESSION_LIFETIME = parseInt(process.env.SESSION_LIFETIME!) || 1000 * 60 * 60 * 24;
export const SESSION_SAME_SITE = process.env.SESSION_SAME_SITE || 'lax';
export const SESSION_RESAVE = process.env.SESSION_RESAVE === 'true' || false;
export const SESSION_SAVE_UNINITIALIZED = process.env.SESSION_SAVE_UNINITIALIZED === 'true' || false;
export const SESSION_HTTP_ONLY = process.env.SESSION_HTTP_ONLY === 'true' || true;

export const VITE_PORT = parseInt(process.env.VITE_PORT!) || 24678;
export const VITE_MIDDLEWARE = process.env.VITE_MIDDLEWARE === 'true' || true;
export const VITE_TYPE = process.env.VITE_TYPE || 'custom';
export const VITE_MANIFEST = 'dist/client/.vite/manifest.json';
export const VITE_SSR = APP_DEBUG ? 'src/client/ssr' : 'dist/ssr/ssr.js';
