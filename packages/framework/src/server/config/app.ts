import path from 'path';

export const PRODUCTION = process.env.APP_ENV === 'production';
export const ROOT_PATH = path.resolve(process.cwd());

export const PORT = process.env.PORT || 5173;
export const APP_SECRET = process.env.APP_SECRET || 'secret-key';

export const APP_VERSION = process.env.npm_package_version || '1.0.0';
export const APP_NAME = process.env.npm_package_name || 'Lalase Framework';

export const IS_DIST = ROOT_PATH.endsWith('dist');
