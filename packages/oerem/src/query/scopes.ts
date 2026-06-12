import type { Knex } from "knex";
import type { ModelOptions, SoftDeleteMode } from "../types/models";

/**
 * Terapkan soft-delete global scope pada Knex QueryBuilder.
 *
 * Implementasi tetap kompatibel dengan perilaku existing code.
 */
export function applySoftDeleteScope<T extends Record<string, unknown>, U extends Record<string, unknown> = {}>(
    currentQuery: Knex.QueryBuilder<T, unknown[]>,
    options: Partial<ModelOptions<T, U>>,
    tableName: string,
    deletedAt: string,
    softDeleteMode: SoftDeleteMode
) {
    if (!options.softDelete) return;

    // Ambil informasi "from" dari internal Knex
    const fromTarget = (currentQuery as any)._single?.table;
    let targetPrefix = tableName; // Default ke nama tabel asli

    // Jika user pakai alias (misal: "users as u"), kita ekstrak "u"
    if (typeof fromTarget === "string" && fromTarget.includes(" as ")) {
        targetPrefix = fromTarget.split(" as ").pop()?.trim() || tableName;
    }

    const column = `${targetPrefix}.${deletedAt}`;

    if (softDeleteMode === "active") {
        currentQuery.whereNull(column);
    } else if (softDeleteMode === "only") {
        currentQuery.whereNotNull(column);
    }
}
