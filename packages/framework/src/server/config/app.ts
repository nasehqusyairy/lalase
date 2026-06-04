export const APP_NAME = process.env.npm_package_name || 'Lalase Framework';
export const APP_VERSION = process.env.npm_package_version || '1.0.0';
export const APP_KEY = process.env.APP_KEY || 'secret-key';
export const APP_DEBUG = process.env.APP_DEBUG === 'true';
export const APP_PORT = parseInt(process.env.APP_PORT!) || 5173;
export const APP_STATIC = APP_DEBUG ? 'public' : 'dist/client';