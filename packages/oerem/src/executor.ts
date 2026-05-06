import type { Knex } from "knex";
import type {
    ModelOptions,
    SoftDeleteMode,
    WithInput,
    Wrapper
} from "./types";

import { controlOutput } from "./helper";
import { wrapOutput } from "./wrap-output";
import { applyEagerLoading } from "./eager-loading";
import { applySoftDeleteScope } from "./soft-delete";

export { wrapOutput } from "./wrap-output";
export { normalizeWith } from "./with-normalizer";


/**
 * Execute a read query (get) and apply:
 * - auditor/guarded checks (write query rejection)
 * - soft-delete global scope
 * - eager loading stitching via `with()`
 * - `.related()` wrapper on each returned row
 */
export async function executeGet<
    R extends unknown,
    T extends Record<string, unknown>,
    U extends Record<string, unknown> = {}
>(
    currentQuery: Knex.QueryBuilder<T, unknown[]>,
    options: Partial<ModelOptions<T, U>>,
    tableName: string,
    deletedAt: string,
    softDeleteMode: SoftDeleteMode,
    withRelations: WithInput<U>[],
    getConnection: () => Knex
): Promise<(R & Wrapper<U>)[]> {
    // Inspect internal Knex state to block illegal calls inside a read chain.
    const statement = (currentQuery as any).toSQL().method;
    const isInsertOrUpdate = ["insert", "update", "delete", "del", "first"].includes(statement);
    const isFirst = statement === "first";

    if (isFirst) {
        throw new Error("Oerem: 'first' is not allowed in 'get' query. Use 'find' or 'first' method instead.");
    }

    if (isInsertOrUpdate) {
        throw new Error("Oerem: Illegal write operation detected in a read query!");
    }

    // Apply soft-delete global scope (if enabled)
    applySoftDeleteScope(currentQuery, options, tableName, deletedAt, softDeleteMode);

    const qresults = await currentQuery;
    const results = Array.isArray(qresults) ? qresults : qresults ? [qresults] : [];
    const cleanResults = controlOutput(results, options);

    if (cleanResults.length === 0) {
        return cleanResults as (R & Wrapper<U>)[];
    }

    // Eager-loading via with(...)
    if (withRelations.length) {
        await applyEagerLoading(
            cleanResults,
            options,
            tableName,
            withRelations,
            deletedAt,
            softDeleteMode,
            getConnection
        );
    }

    // Attach `.related()` helper
    wrapOutput(cleanResults, options, getConnection);

    return cleanResults as (R & Wrapper<U>)[];
}

