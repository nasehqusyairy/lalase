import type { Middleware } from '@server/types';

export const flashMiddleware: Middleware = ({ req, res, next }) => {
    res.locals.errors = req.session.errors || {};
    res.locals.old = req.session.old || {};

    delete req.session.errors;
    delete req.session.old;

    next();
};

export default flashMiddleware;
