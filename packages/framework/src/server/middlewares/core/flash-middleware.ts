import type { Middleware } from '@server/types';

export default (({ req, res, next }) => {
    res.locals.errors = req.session.errors || {};
    res.locals.old = req.session.old || {};

    delete req.session.errors;
    delete req.session.old;

    next();
}) as Middleware;
