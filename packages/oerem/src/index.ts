export type * from './types';

import { AsyncLocalStorage } from 'async_hooks';
import knex, { type Knex } from "knex";

import { OeremModel, createModel } from './model';

export { hasMany, hasOne, belongsTo, belongsToMany } from './helper';

// Re-export Model class for OOP access
export { OeremModel } from './model';

/**
 * Create Pool - Initialize database connection and return pool instance
 * Maintains backward compatibility while using OOP-based Model class internally
 */
export function createPool(config: Knex.Config) {
    const connection = knex(config);
    const trxStore = new AsyncLocalStorage<Knex.Transaction>();
    const getConnection = () => trxStore.getStore() || connection;

    // Use the OOP-based createModel factory
    const modelFactory = createModel(getConnection);

    return {
        getConnection,
        async transaction(callback: () => Promise<void>) {
            return connection.transaction(async (trx) => {
                return await trxStore.run(trx, callback);
            })
        },
        createModel: modelFactory,
    };
}

export type PoolInstance = ReturnType<typeof createPool>;
