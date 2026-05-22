import type { Middleware } from '@server/types';

export default (({ req, res, next }) => {
    const user = (req.session as any)?.user;

    if (!user) {
        // Simpan URL untuk redirect setelah login
        (req.session as any).redirect_to = req.originalUrl;
        return res.inertia.location('/login');
    }

    // Attach user to request for use in controllers
    (req as any).user = user;

    next();
}) as Middleware;
