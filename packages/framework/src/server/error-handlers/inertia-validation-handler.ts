import { ValidationException } from "@server/lib/exception";
import type { ErrorHandler } from "@server/types";

/**
 * Helper untuk mengubah format error internal (array) menjadi format Inertia (flat string)
 * Mengambil indeks pertama [0] dari setiap field error.
 */
const flattenErrors = (errors: Record<string, string[]>): Record<string, string> => {
    const flattened: Record<string, string> = {};

    for (const [field, messages] of Object.entries(errors)) {
        if (Array.isArray(messages) && messages.length > 0) {
            flattened[field] = messages[0];
        }
    }

    return flattened;
};

export default (({
    err,
    req,
    res,
    next,
}) => {
    // 1. Tangkap khusus ValidationException
    if (err instanceof ValidationException) {
        const rawErrors = err.errors as Record<string, string[]>;

        // Ambil data input lama untuk repopulasi form di frontend
        req.session._old = err.old || req.body || {};

        // 2. Cek apakah request dikirim oleh Inertia (melalui header X-Inertia)
        if (req.headers['x-inertia']) {
            // Transformasi menjadi Record<string, string> demi kepatuhan props Inertia
            req.session._errors = flattenErrors(rawErrors);
        } else {
            // Jika request datang dari REST API biasa (Postman/Mobile App),
            // Anda bisa langsung mengembalikan response JSON dengan struktur array utuh
            return res.status(422).json({
                message: 'The given data was invalid.',
                errors: rawErrors
            });
        }

        // 3. Alihkan user kembali ke halaman form asal menggunakan helper back()
        return res.inertia.back();
    }

    // Oper ke handler berikutnya jika bukan error validasi (misal: Error 500)
    else {
        next(err);
    }
}) as ErrorHandler;