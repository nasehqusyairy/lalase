import type { ModelOptions } from "../types/models";

export function applySecurity<T extends Record<string, unknown>>(
    data: Partial<T>,
    options: Partial<ModelOptions<T>>
): Partial<T> {
    const keys = Object.keys(data);

    // 1. Cek Guarded: Jika ada key yang dilarang, langsung lempar error
    if (options.guarded && options.guarded.length > 0) {
        const forbidden = keys.filter(key => options.guarded!.includes(key));
        if (forbidden.length > 0) {
            throw new Error(
                `Oerem Security Error: Cannot write to guarded field(s): [${forbidden.join(', ')}]`
            );
        }
    }

    // 2. Cek Fillable: Jika fillable didefinisikan, pastikan HANYA yang ada di sana yang dikirim
    if (options.fillable && options.fillable.length > 0) {
        const unknownKeys = keys.filter(key => !options.fillable!.includes(key));

        if (unknownKeys.length > 0) {
            throw new Error(
                `Oerem Security Error: Field(s) [${unknownKeys.join(', ')}] are not in fillable list.`
            );
        }

        // Karena sudah divalidasi tidak ada field asing, kita bisa return datanya
        return data;
    }

    return data;
}

export function applyHidden<T extends Record<string, unknown>[]>(
    results: T,
    hidden: string[]
) {
    return results.map(row => {
        const cleanRow = { ...row };

        // Override toJSON agar hidden fields tidak muncul saat stringify
        Object.defineProperty(cleanRow, "toJSON", {
            enumerable: false,
            value: function () {
                const json = { ...this };
                hidden.forEach(key => delete json[key]);
                return json;
            }
        });

        return cleanRow;
    }) as T;
}

export function controlOutput<R extends unknown[], T extends Record<string, unknown>>(
    results: R,
    options: Partial<ModelOptions<T>>
): R {
    // --- Hidden Attributes Logic ---
    if (options.hidden && options.hidden.length > 0) {
        return applyHidden(results as Record<string, unknown>[], options.hidden as string[]) as unknown as R;
    }

    return results;
}
