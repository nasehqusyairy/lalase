import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { deepTrim } from '@server/core/request';
import { castValue } from '@shared/helpers';
import { AuthorizationError, ValidationError } from '@server/core/error';
import type { RequestDefinition } from '@server/types';

export const requestMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    req.all = () => {
        return deepTrim({
            ...req.query,
            ...req.body,
            ...(req.files ? { files: req.files } : {}),
        });
    };

    const input = req.all();

    // req.input<T>(key, default)
    req.input = function <T>(key: string, defaultValue?: T): T | undefined {
        const value = input[key];
        return castValue(value, defaultValue);
    };

    // req.param<T>(key, default)
    req.param = function <T>(key: string, defaultValue?: T): T | undefined {
        const value = req.params[key];
        return castValue(value, defaultValue);
    };

    // req.validate<T>({ authorize, schema })
    req.validate = async function <T>({ authorize, schema }: RequestDefinition<T>) {
        /* ========================
         * Authorization
         * ======================== */
        if (authorize) {
            const allowed = await authorize();
            if (!allowed) {
                throw new AuthorizationError();
            }
        }

        /* ========================
         * Validation
         * ======================== */
        const result = await schema.safeParseAsync(input);

        if (!result.success) {
            throw new ValidationError(
                result.error.flatten().fieldErrors as Record<string, string[]>,
                input
            );
        }

        /* ========================
         * Typed & Sanitized
         * ======================== */
        return result.data;
    };

    next();
};
