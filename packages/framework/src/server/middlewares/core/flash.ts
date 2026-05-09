import { type RequestHandler } from 'express';

export const flashMiddleware: RequestHandler = (req, res, next) => {
    res.locals.errors = req.session.errors || {};
    res.locals.old = req.session.old || {};

    delete req.session.errors;
    delete req.session.old;

    next();
};
