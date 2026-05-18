import session from '@server/bootstrap/session';
import type { Middleware } from '@server/types';

export default (({ req, res, next }) => {
    session(req, res, next);
}) as Middleware;
