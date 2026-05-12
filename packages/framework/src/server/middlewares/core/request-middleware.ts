import { castValue } from '@shared/helpers';
import { AuthorizationError, ValidationError } from '@server/core/error';
import type { Middleware, RequestDefinition } from '@server/types';

function deepTrim<T>(value: T): T {
    if (typeof value === 'string') {
        return value.trim() as unknown as T;
    }

    // Hindari trimming untuk objek native Node/Browser agar casting tetap aman
    if (value instanceof Date || value instanceof Buffer) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(v => deepTrim(v)) as unknown as T;
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, deepTrim(v)])
        ) as unknown as T;
    }

    return value;
}

export default (({ req, res, next }) => {
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
}) as Middleware;
