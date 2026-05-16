import path from 'path';

export const APP_NAME = process.env.npm_package_name || 'Lalase Framework';
export const APP_VERSION = process.env.npm_package_version || '1.0.0';
export const APP_SECRET = process.env.APP_SECRET || 'secret-key';


export const PRODUCTION = process.env.APP_ENV === 'production';
export const PORT = process.env.PORT || 5173;

export const ROOT_PATH = path.resolve(process.cwd());
export const STATIC_PATH = PRODUCTION ? 'dist/client' : 'public'
export const VIEW_PATH = 'views'