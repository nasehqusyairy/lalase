import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory of the server.ts file (project root)
// From server/core/config.ts: go up 3 levels (core -> server -> src -> framework root)
const serverTsPath = fileURLToPath(new URL('../../../server.ts', import.meta.url));
export const ROOT_PATH = path.dirname(serverTsPath);

// Environment configuration
export const PRODUCTION = process.env.APP_ENV === 'production';
export const PORT = process.env.PORT || 5173;
export const APP_NAME = process.env.APP_NAME || 'react-monolith';
export const APP_SECRET = process.env.APP_SECRET || 'secret-key';

// Helper to detect if running from 'dist' folder or root
export const IS_DIST = ROOT_PATH.endsWith('dist');

/**
 * Get runtime path for files
 * In production, view/client files are in dist folder
 */
export function runtimePath(...segments: string[]): string {
    return path.join(ROOT_PATH, ...segments);
}
