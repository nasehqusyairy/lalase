import { readFileSync } from 'fs';
import { APP_DEBUG } from '@server/config/app';
import type { ErrorHandler } from '@server/types';
import { HttpException } from '../definitions/http-exception';

export default (({ err, res, next, }) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof HttpException) {
        return res.status(err.status).json({
            message: err.message,
        });
    }

    console.error('SERVER ERROR:', err);

    if (!APP_DEBUG || !err.stack) {
        return res.status(500).render('error', {
            message: 'Terjadi kesalahan pada server',
        });
    }

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

    // return res.status(500).render('error', {
    //     message: err.message,
    //     filePath,
    //     lineNumber,
    //     fileContent,
    // });
    return res.status(500);
}) as ErrorHandler;
