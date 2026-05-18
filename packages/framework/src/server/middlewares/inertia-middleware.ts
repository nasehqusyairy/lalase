import { APP_VERSION } from '@server/config/app';
import type { Middleware } from '@server/types';

export default (async ({ req, res, next }) => {
    // Asset Versioning: tolak request jika versi client tidak sesuai dengan server
    const requestVersion = req.headers['x-inertia-version'] as string | undefined;
    if (requestVersion && requestVersion !== APP_VERSION) {
        res.status(409);
        res.setHeader('X-Inertia-Version', APP_VERSION);
        return res.json({ error: 'Version mismatch', status: 409 });
    }

    next();
}) as Middleware;