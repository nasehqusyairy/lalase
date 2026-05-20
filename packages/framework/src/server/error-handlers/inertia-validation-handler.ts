import { ValidationException } from "@server/lib/exception";
import type { ErrorHandler } from "@server/types";


const flattenErrors = (errors: Record<string, string[]>): Record<string, string> => {
    const flattened: Record<string, string> = {};

    for (const [field, messages] of Object.entries(errors)) {
        if (Array.isArray(messages) && messages.length > 0) {
            flattened[field] = messages[0];
        }
    }

    return flattened;
};

export default (({ err, req, res, next, }) => {
    if (err instanceof ValidationException) {
        const rawErrors = err.errors as Record<string, string[]>;

        req.session._old = err.old || req.body || {};

        if (req.headers['x-inertia']) {
            req.session._errors = flattenErrors(rawErrors);
        } else {
            return res.status(422).json({
                message: 'The given data was invalid.',
                errors: rawErrors
            });
        }
        return res.inertia.back();
    } else {
        next(err);
    }
}) as ErrorHandler;