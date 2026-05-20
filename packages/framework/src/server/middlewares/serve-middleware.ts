import type { Middleware } from '@server/types';
import vite from '@server/bootstrap/vite';

export default (async (arg) => vite.runMiddleware(arg)) as Middleware;
