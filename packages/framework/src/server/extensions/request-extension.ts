import vine, { ValidationError } from '@vinejs/vine';
import { AuthorizationException, ValidationException } from '@server/lib/exception';
import type { AppExtension } from "@server/types";
import type { RequestDefinition } from "@server/types";

/**
 * Convert VineJS ValidationError to ValidationException
 */
function convertToValidationException(error: ValidationError, old: Record<string, any>): ValidationException {
    const errors: Record<string, string[]> = {};

    // 1. Cek apakah ini benar-type error validasi VineJS
    // Pada raw error default VineJS, error.messages adalah Array of Objects
    if (Array.isArray(error.messages)) {
        for (const msg of error.messages) {
            // VineJS menggunakan properti 'field', bukan 'name'
            const field = msg.field || 'root';

            if (!errors[field]) {
                errors[field] = [];
            }
            // Mengambil string pesan error
            errors[field].push(msg.message);
        }

        return new ValidationException(errors, old);
    }

    // Jika error.messages ternyata sudah berbentuk objek (karena reporter lain)
    if (error.messages && typeof error.messages === 'object') {
        return new ValidationException(error.messages, old);
    }

    // Fallback jika terjadi error tak terduga yang bukan format standar
    return new ValidationException({ root: [error.message || 'Validation failed'] }, old);
}

/**
 * Request Extension - Menambahkan validate ke req
 * 
 * Using app.request.defineProperty to lazily add req.validate
 */
export default ((app) => {
    app.request.defineProperty('validate', function (req) {
        return async function <T>(data: any, { schema, authorize }: RequestDefinition<T>): Promise<T> {
            // Check authorization first
            if (authorize) {
                const isAuthorized = await authorize();
                if (!isAuthorized) {
                    throw new AuthorizationException();
                }
            }

            // Compile schema using VineJS
            const validator = vine.create(schema);

            try {
                // Validate data
                const output = await validator.validate(data);

                // Return validated data
                return output as T;
            } catch (error: any) {
                // Convert VineJS errors to ValidationException
                throw convertToValidationException(error, data);
            }
        };
    });
}) as AppExtension;
