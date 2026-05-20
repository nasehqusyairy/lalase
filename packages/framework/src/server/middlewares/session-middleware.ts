import session from '@server/config/session';
import type { Middleware } from '@server/types';

export default (({ req, res, next }) => session(req, res, () => {
    // Jika request datang dari localhost atau 127.0.0.1, paksa secure jadi false
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        if (req.session && req.session.cookie) {
            req.session.cookie.secure = false;
        }
    }
    next();
})) as Middleware;
