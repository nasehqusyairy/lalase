import path from 'path';

export const APP_NAME = process.env.npm_package_name || 'Lalase Framework';
export const APP_VERSION = process.env.npm_package_version || '1.0.0';
export const APP_SECRET = process.env.APP_SECRET || 'secret-key';

export const PRODUCTION = process.env.APP_ENV === 'production';

export const PORT = process.env.PORT || 5173;

export const ROOT_PATH = path.resolve(process.cwd());
export const STATIC_PATH = PRODUCTION ? 'dist/client' : 'public';
export const VIEW_PATH = 'views';

export const DB_CLIENT = process.env.DB_CLIENT || 'mysql2';
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = parseInt(process.env.DB_PORT || '3306');
export const DB_USERNAME = process.env.DB_USERNAME || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'lalase';

export const SESSION_SECRET = process.env.SESSION_SECRET || APP_SECRET;
export const SESSION_NAME = process.env.SESSION_NAME || 'sid';
export const SESSION_LIFETIME = process.env.SESSION_LIFETIME || 1000 * 60 * 60 * 24;
export const SESSION_SAME_SITE = process.env.SESSION_SAME_SITE || 'lax';
export const SESSION_RESAVE = process.env.SESSION_RESAVE === 'true' || false;
export const SESSION_SAVE_UNINITIALIZED = process.env.SESSION_SAVE_UNINITIALIZED === 'true' || false;
export const SESSION_HTTP_ONLY = process.env.SESSION_HTTP_ONLY === 'true' || true;

export const VITE_DEV_SERVER_PORT = 24678;
export const VITE_IS_MIDDLEWARE_MODE = true;
export const VITE_APP_TYPE = 'custom';

export const VITE_MANIFEST_PATH = 'dist/client/.vite/manifest.json';
export const VITE_ENTRY_SERVER_PATH = 'src/client/entry-server';
export const VITE_ENTRY_SERVER_BUILD_PATH = 'dist/ssr/entry-server.js';
