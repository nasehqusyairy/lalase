import type { Middleware } from '@server/types';

export default (({ req, res, next }) => {
    const flashData = {
        errors: req.session?._errors || {},
        old: req.session?._old || {},
        success: req.session?._success || null,
        message: req.session?._message || null,
    };

    res.locals = {
        ...res.locals,
        flash: flashData
    };

    if (req.session) {
        delete req.session._errors;
        delete req.session._old;
        delete req.session._success;
        delete req.session._message;
    }

    next();
}) as Middleware;