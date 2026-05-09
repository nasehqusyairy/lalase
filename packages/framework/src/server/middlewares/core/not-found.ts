import type { Request, Response, RequestHandler } from 'express';

/**
 * Not Found (404) middleware - handles unmatched routes
 */
export const notFoundMiddleware: RequestHandler = (req: Request, res: Response) => {
    res.status(404).render('error', {
        message: 'Halaman tidak ditemukan',
    });
};
