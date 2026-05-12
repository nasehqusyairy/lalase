import type { Middleware } from '@server/types';

export default (({ req, res, next }) => {
    res.flash = {};
    res.flash.errors = req.session.errors || {};
    res.flash.old = req.session.old || {};

    delete req.session.errors;
    delete req.session.old;

    next();
}) as Middleware;
