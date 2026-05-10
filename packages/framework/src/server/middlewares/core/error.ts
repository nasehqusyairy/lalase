import { readFileSync } from 'fs';
import { HttpError, ValidationError } from '@server/core/error';
import { PRODUCTION } from '@server/core/config';
import type { Middleware } from '@server/types';

/**
 * Error handling middleware - handles all server errors
 * Returns appropriate response based on error type
 */
export const errorMiddleware: Middleware = ({
    err,
    req,
    res,
    next,
}) => {
    // Skip if no error
    if (!err) {
        return next();
    }

    // Skip if headers already sent
    if (res.headersSent) {
        return next(err);
    }

    /* ========================
     * Known Http Errors
     * ======================== */
    if (err instanceof HttpError) {
        // Validation errors - return JSON with errors
        if (err instanceof ValidationError) {
            return res.status(err.status).json({
                message: err.message,
                errors: err.errors,
            });
        }

        // Other HTTP errors (403, 404, etc) - return JSON
        return res.status(err.status).json({
            message: err.message,
        });
    }

    /* ========================
     * Unknown Error
     * ======================== */
    console.error('SERVER ERROR:', err);

    // Production mode or no stack - generic error page
    if (PRODUCTION || !err.stack) {
        return res.status(500).render('error', {
            message: 'Terjadi kesalahan pada server',
        });
    }

    /* ========================
     * Dev Debug Info
     * ======================== */
    // Extract file path, line number from stack trace
    const match = err.stack.match(
        /at .*?\(?(?:file:\/\/)?(\/.*?):(\d+):(\d+)\)?/
    );

    let filePath = '';
    let lineNumber = 0;
    let fileContent = '';

    if (match) {
        filePath = match[1];
        lineNumber = Number(match[2]);

        try {
            fileContent = readFileSync(filePath, 'utf-8');
        } catch {
            fileContent = 'Tidak dapat membaca file sumber.';
        }
    }

    // Render error page with debug info
    return res.status(500).render('error', {
        message: err.message,
        filePath,
        lineNumber,
        fileContent,
    });
};
