// ============================================================
// OEREM - Main Entry Point
// A simple and lightweight ORM for Node.js built on top of Knex.js
// ============================================================

export type * from './types/index';

// Re-export core modules
export { OeremModel, createModel } from './core/model';
export { OeremBuilder } from './core/builder';
export type { ModelRegistry } from './core/registry';
export type { ModelContext } from './core/context';
export { executeGet } from './core/executor';

// Re-export relation modules
export { hasMany, hasOne, belongsTo, belongsToMany } from './relations';
export { RelationHandler, createRelationHandler } from './relations/handler';
export { applyEagerLoading } from './relations/eager-loading';

// Re-export security modules
export { applySecurity, applyHidden, controlOutput } from './security/guard';

// Re-export query modules
export type { SelectBuilder } from './query/select';
export { applySoftDeleteScope } from './query/scopes';

// Re-export output wrapper
export { wrapOutput } from './output/wrapper';

// Re-export utilities
export { normalizeWith } from './utils/normalizer';

import { AsyncLocalStorage } from 'async_hooks';
import knex, { type Knex } from "knex";

import { OeremModel, createModel } from './core/model';
import type { ModelOptions } from './types/models';

/**
 * Create Pool - Initialize database connection and return pool instance
 * Maintains backward compatibility while using OOP-based Model class internally
 */
export function createPool(config: Knex.Config) {
    const connection = knex(config);
    const trxStore = new AsyncLocalStorage<Knex.Transaction>();
    const getConnection = () => trxStore.getStore() || connection;

    return {
        getConnection,
        async transaction(callback: () => Promise<void>) {
            return connection.transaction(async (trx) => {
                return await trxStore.run(trx, callback);
            });
        },
        // PERBAIKAN: Buat modelFactory menerima generic secara dinamis saat dipanggil
        createModel: <
            T extends Record<string, unknown>,
            U extends Record<string, unknown> = {}
        >(
            tableName: string,
            options: Partial<ModelOptions<T, U>> = {}
        ) => {
            // Memanggil fungsi factory internal bawaan dari './core/model'
            return createModel<T, U>(getConnection)(tableName, options);
        },
    };
}

export type PoolInstance = ReturnType<typeof createPool>;
