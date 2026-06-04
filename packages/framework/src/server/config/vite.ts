import { APP_DEBUG } from "./app";

export const VITE_PORT = parseInt(process.env.VITE_PORT!) || 24678;
export const VITE_MIDDLEWARE = process.env.VITE_MIDDLEWARE === 'true' || true;
export const VITE_TYPE = process.env.VITE_TYPE || 'custom';
export const VITE_MANIFEST = 'dist/client/.vite/manifest.json';
export const VITE_SSR = APP_DEBUG ? 'src/client/ssr' : 'dist/ssr/ssr.js';
export const VITE_APP = 'src/client/app.tsx';
