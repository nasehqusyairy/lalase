export type * from './types';

import { AsyncLocalStorage } from 'async_hooks';
import knex, { type Knex } from "knex";
import type {
    ModelOptions,
    Model,
} from "./types";
import { ModelRegistry } from './registry';

import { coreMethods } from './model-methods';
import type { ModelContext } from './context';

export { hasMany, hasOne, belongsTo, belongsToMany } from './helper';

/**
 * Model Factory - Creates model instances that use shared coreMethods
 * Each instance only stores its own context (tableName, options, getConnection)
 * Methods are bound references to coreMethods with context attached
 */
const model = (getConnection: () => Knex) => <T extends Record<string, unknown>, U extends Record<string, unknown> = {}>(tableName: string, options: Partial<ModelOptions<T, U>> = {}): Model<T, U> => {
    const ctx: ModelContext = {
        tableName,
        options: options as unknown as Record<string, unknown>,
        getConnection,
        pk: (options.primaryKey || 'id') as string,
        deletedAt: (options.deletedAtColumn || 'deleted_at') as string
    };

    const instance: Model<T, U> = {
        tableName,
        with: coreMethods.with.bind(null, ctx) as any,
        query: coreMethods.query.bind(null, ctx) as any,
        all: coreMethods.all.bind(null, ctx) as any,
        find: coreMethods.find.bind(null, ctx) as any,
        withTrashed: coreMethods.withTrashed.bind(null, ctx) as any,
        onlyTrashed: coreMethods.onlyTrashed.bind(null, ctx) as any,
        create: coreMethods.create.bind(null, ctx) as any,
        insert: coreMethods.insert.bind(null, ctx) as any,
        update: coreMethods.update.bind(null, ctx) as any,
        delete: coreMethods.delete.bind(null, ctx) as any,
        softDelete: coreMethods.softDelete.bind(null, ctx) as any
    };

    ModelRegistry.register(tableName, instance as unknown as Model<Record<string, unknown>, Record<string, unknown>>);

    return instance;
};

/**
 * Create Pool - Initialize database connection and return pool instance
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
            })
        },
        createModel: model(getConnection),
    };
}

export type PoolInstance = ReturnType<typeof createPool>;
