import { back } from "@server/core/inertia";
import type { ErrorHandler, VineValidationError } from "@server/types";
import { setFlash } from "@server/core/session";
import { errors as VineError } from "@vinejs/vine";

export default (async ({ err, request, response, next, }) => {
    if (err instanceof VineError.E_VALIDATION_ERROR) {
        const errors = (err as VineValidationError).messages.reduce((acc, { field = 'root', message }) => {
            acc[field] ??= message;
            return acc;
        }, {});

        if (request.headers['x-inertia']) {
            await setFlash({ errors });
            return back();
        } else {
            return response.status(422).json({
                message: 'The given data was invalid.',
                errors
            });
        }
    } else {
        next(err);
    }
}) as ErrorHandler
