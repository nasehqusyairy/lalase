import vine from "@vinejs/vine";
import { AuthorizationException, ValidationException } from "./exception";

export async function validate<T>(
    data: any,
    request: {
        authorize?: () => boolean | Promise<boolean>;
        schema: any;
    }): Promise<T> {
    // Check authorization first
    if (request.authorize) {
        const isAuthorized = await request.authorize();
        if (!isAuthorized) {
            throw new AuthorizationException();
        }
    }

    // Compile schema using VineJS
    const validator = vine.create(request.schema);

    try {
        // Validate data
        const output = await validator.validate(data);

        // Return validated data
        return output as any;
    } catch (error: any) {
        const errors: Record<string, string[]> = {};

        // Cek apakah ini benar-type error validasi VineJS
        // Pada raw error default VineJS, error.messages adalah Array of Objects
        if (Array.isArray(error.messages)) {
            for (const msg of error.messages) {
                const field = msg.field || 'root';

                if (!errors[field]) {
                    errors[field] = [];
                }
                // Mengambil string pesan error
                errors[field].push(msg.message);
            }

            throw new ValidationException(errors, data);
        }

        // Jika error.messages ternyata sudah berbentuk objek (karena reporter lain)
        if (error.messages && typeof error.messages === 'object') {
            throw new ValidationException(error.messages, data);
        }

        // Fallback jika terjadi error tak terduga yang bukan format standar
        throw new ValidationException({ root: [error.message || 'Validation failed'] }, data);
    }
};