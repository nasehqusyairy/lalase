import Knex from 'knex'
import type { Knex as KnexType } from 'knex'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { ModelDef } from '../schema/types.js'
import { OeremModel } from './model.js'

// ─── Transaction Storage ──────────────────────────────────────────────────────
// Stores the active transaction per async context so models automatically
// use the transaction when one is active.

const txStorage = new AsyncLocalStorage<KnexType.Transaction>()

// ─── OeremPool ────────────────────────────────────────────────────────────────

export class OeremPool {
    private readonly knex: KnexType

    constructor(config: KnexType.Config) {
        this.knex = Knex(config)
    }

    // ─── Create model ──────────────────────────────────────────────────────────

    createModel<T extends object, R extends object>(
        def: ModelDef,
    ): OeremModel<T, R> {
        return new TransactionAwareModel<T, R>(this.knex, def, txStorage)
    }

    // ─── Transaction ───────────────────────────────────────────────────────────

    async transaction<Result>(
        callback: () => Promise<Result>,
    ): Promise<Result> {
        return this.knex.transaction(async (trx) => {
            return txStorage.run(trx, callback)
        })
    }

    // ─── Raw query ─────────────────────────────────────────────────────────────

    raw(sql: string, bindings?: KnexType.RawBinding): KnexType.Raw {
        const trx = txStorage.getStore()
        return (trx ?? this.knex).raw(sql, bindings as KnexType.RawBinding)
    }

    // ─── Destroy connection pool ───────────────────────────────────────────────

    async destroy(): Promise<void> {
        await this.knex.destroy()
    }

    // ─── Expose underlying knex ────────────────────────────────────────────────

    getKnex(): KnexType {
        return this.knex
    }
}

// ─── TransactionAwareModel ────────────────────────────────────────────────────
// Extends OeremModel but resolves knex at query time — uses the active
// transaction if one exists in the current async context.

class TransactionAwareModel<T extends object, R extends object> extends OeremModel<T, R> {
    private readonly baseKnex: KnexType
    private readonly txStore: AsyncLocalStorage<KnexType.Transaction>

    constructor(
        knex: KnexType,
        def: ModelDef,
        txStore: AsyncLocalStorage<KnexType.Transaction>,
    ) {
        super(knex, def)
        this.baseKnex = knex
        this.txStore = txStore
    }

    private getActiveKnex(): KnexType | KnexType.Transaction {
        return this.txStore.getStore() ?? this.baseKnex
    }

    private scoped(): OeremModel<T, R> {
        return new OeremModel<T, R>(this.getActiveKnex() as KnexType, this.def)
    }

    override async findMany(...args: Parameters<OeremModel<T, R>['findMany']>): Promise<T[]> {
        return this.scoped().findMany(...args)
    }

    override async findOne(...args: Parameters<OeremModel<T, R>['findOne']>): Promise<T | null> {
        return this.scoped().findOne(...args)
    }

    override async findById(...args: Parameters<OeremModel<T, R>['findById']>): Promise<T | null> {
        return this.scoped().findById(...args)
    }

    override async insert(...args: Parameters<OeremModel<T, R>['insert']>): Promise<T> {
        return this.scoped().insert(...args)
    }

    override async insertMany(...args: Parameters<OeremModel<T, R>['insertMany']>): Promise<void> {
        return this.scoped().insertMany(...args)
    }

    override async update(...args: Parameters<OeremModel<T, R>['update']>): Promise<number> {
        return this.scoped().update(...args)
    }

    override async updateById(...args: Parameters<OeremModel<T, R>['updateById']>): Promise<T | null> {
        return this.scoped().updateById(...args)
    }

    override async delete(...args: Parameters<OeremModel<T, R>['delete']>): Promise<number> {
        return this.scoped().delete(...args)
    }

    override async deleteById(...args: Parameters<OeremModel<T, R>['deleteById']>): Promise<number> {
        return this.scoped().deleteById(...args)
    }

    override async paginate(
        ...args: Parameters<OeremModel<T, R>['paginate']>
    ): ReturnType<OeremModel<T, R>['paginate']> {
        return this.scoped().paginate(...args)
    }

    override async with<K extends keyof R>(rows: T[], ...relations: K[]): Promise<(T & Pick<R, K>)[]> {
        return this.scoped().with(rows, ...relations)
    }

    override query(): KnexType.QueryBuilder {
        return this.scoped().query()
    }

    override raw(sql: string, bindings?: KnexType.RawBinding): KnexType.Raw {
        return this.scoped().raw(sql, bindings)
    }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPool(config: KnexType.Config): OeremPool {
    return new OeremPool(config)
}