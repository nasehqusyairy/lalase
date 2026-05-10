import type { Middleware } from '@server/types';

/**
 * Not Found (404) middleware - handles unmatched routes
 */
export const notFoundMiddleware: Middleware = ({ req, res }) => {
    res.status(404).render('error', {
        message: 'Halaman tidak ditemukan',
    });
};
