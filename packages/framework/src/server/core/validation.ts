import { z } from 'zod';

export const rule = {
    ...z,
    // Custom boolean untuk menangani checkbox HTML
    boolean: () => z.preprocess(
        (val) => val === 'on' || val === 'true' || val === true,
        z.boolean()
    ),

    // Contoh lain: Mengubah string kosong menjadi null (sangat berguna untuk DB)
    stringToNull: () => z.preprocess(
        (val) => (val === '' ? null : val),
        z.string().nullable()
    ),

    // Auto-coerce number yang aman
    number: () => z.coerce.number(),
};