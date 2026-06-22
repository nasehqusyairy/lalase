import Knex from 'knex'
import type { Knex as KnexType } from 'knex'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { ModelDef } from '../schema/types.js'
import { OeremModel } from './model.js'
import { OeremQueryBuilder } from './query-builder.js'

// ─── Transaction Storage ──────────────────────────────────────────────────────

const txStorage = new AsyncLocalStorage<KnexType.Transaction>()

// ─── OeremPool ────────────────────────────────────────────────────────────────

export class OeremPool {
    private readonly knex: KnexType

    constructor(config: KnexType.Config) {
        this.knex = Knex(config)
    }

    createModel<T extends object, R extends object>(
        def: ModelDef,
    ): OeremModel<T, R> {
        return new TransactionAwareModel<T, R>(this.knex, def, txStorage)
    }

    async transaction<Result>(
        callback: () => Promise<Result>,
    ): Promise<Result> {
        return this.knex.transaction(async (trx) => {
            return txStorage.run(trx, callback)
        })
    }

    raw(sql: string, bindings?: KnexType.RawBinding): KnexType.Raw {
        const trx = txStorage.getStore()
        return (trx ?? this.knex).raw(sql, bindings as KnexType.RawBinding)
    }

    async destroy(): Promise<void> {
        await this.knex.destroy()
    }

    getKnex(): KnexType {
        return this.knex
    }
}

// ─── TransactionAwareModel ────────────────────────────────────────────────────
// Overrides query() to inject the active transaction knex at query time.

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

    // All operations go through query(), so overriding this is enough.
    override query(): OeremQueryBuilder<T, R> {
        return new OeremQueryBuilder<T, R>(this.getActiveKnex() as KnexType, this.def)
    }

    // insert and insertMany bypass query() so override them too.
    override async insert(data: Partial<T>): Promise<T> {
        const knex = this.getActiveKnex()
        const { applyHashing } = await import('./processor.js')
        const hashed = await applyHashing(data as Record<string, unknown>, this.def)
        const pkColumn = this.getPrimaryKey()
        const [id] = await knex(this.def.table).insert(hashed)
        const row = await this.findById(id ?? (hashed[pkColumn] as number | string))
        if (!row) throw new Error(`Insert succeeded but could not retrieve the created row.`)
        return row
    }

    override async insertMany(rows: Partial<T>[]): Promise<void> {
        const knex = this.getActiveKnex()
        const { applyHashing } = await import('./processor.js')
        const hashed = await Promise.all(
            rows.map(r => applyHashing(r as Record<string, unknown>, this.def))
        )
        await knex(this.def.table).insert(hashed)
    }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPool(config: KnexType.Config): OeremPool {
    return new OeremPool(config)
}