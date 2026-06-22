import type { Knex } from 'knex'
import type { ModelDef } from '../schema/types.js'
import { applyHashing } from './processor.js'
import { OeremQueryBuilder, getPrimaryKeyFromDef, type PaginateResult, type OrderDirection } from './query-builder.js'

// ─── OeremModel ───────────────────────────────────────────────────────────────
// T — full schema type (already includes R via intersection in generated types)
// R — relation keys, used only to constrain .with() and .query().with() calls

export class OeremModel<T extends object, R extends object = Record<string, never>> {
    protected readonly knex: Knex
    readonly def: ModelDef

    constructor(knex: Knex, def: ModelDef) {
        this.knex = knex
        this.def = def
    }

    // ─── Query builder entry point ─────────────────────────────────────────────

    query(): OeremQueryBuilder<T, R> {
        return new OeremQueryBuilder<T, R>(this.knex, this.def)
    }

    // ─── Shorthand: find ──────────────────────────────────────────────────────

    async findMany(
        where?: Partial<T>,
        options?: {
            orderBy?: { column: keyof T & string; direction?: OrderDirection }
            limit?: number
            offset?: number
        }
    ): Promise<T[]> {
        let q = this.query()
        if (where) q = q.where(where)
        if (options?.orderBy) q = q.orderBy(options.orderBy.column, options.orderBy.direction)
        if (options?.limit !== undefined) q = q.limit(options.limit)
        if (options?.offset !== undefined) q = q.offset(options.offset)
        return q.get()
    }

    async findOne(where: Partial<T>): Promise<T | null> {
        return this.query().where(where).first()
    }

    async findById(id: number | string): Promise<T | null> {
        const pkColumn = this.getPrimaryKey()
        return this.query().where({ [pkColumn]: id } as Partial<T>).first()
    }

    // ─── Shorthand: insert ────────────────────────────────────────────────────

    async insert(data: Partial<T>): Promise<T> {
        const hashed = await applyHashing(data as Record<string, unknown>, this.def)
        const pkColumn = this.getPrimaryKey()
        const [id] = await this.knex(this.def.table).insert(hashed)
        const row = await this.findById(id ?? (hashed[pkColumn] as number | string))
        if (!row) throw new Error(`Insert succeeded but could not retrieve the created row.`)
        return row
    }

    async insertMany(rows: Partial<T>[]): Promise<void> {
        const hashed = await Promise.all(
            rows.map(r => applyHashing(r as Record<string, unknown>, this.def))
        )
        await this.knex(this.def.table).insert(hashed)
    }

    // ─── Shorthand: update ────────────────────────────────────────────────────

    async update(where: Partial<T>, data: Partial<T>): Promise<number> {
        return this.query().where(where).update(data)
    }

    async updateById(id: number | string, data: Partial<T>): Promise<T | null> {
        const pkColumn = this.getPrimaryKey()
        await this.query().where({ [pkColumn]: id } as Partial<T>).update(data)
        return this.findById(id)
    }

    // ─── Shorthand: delete ────────────────────────────────────────────────────

    async delete(where: Partial<T>): Promise<number> {
        return this.query().where(where).delete()
    }

    async deleteById(id: number | string): Promise<number> {
        const pkColumn = this.getPrimaryKey()
        return this.query().where({ [pkColumn]: id } as Partial<T>).delete()
    }

    // ─── Shorthand: paginate ──────────────────────────────────────────────────

    async paginate(
        page: number,
        perPage: number,
        where?: Partial<T>,
    ): Promise<PaginateResult<T>> {
        let q = this.query()
        if (where) q = q.where(where)
        return q.paginate(page, perPage)
    }

    // ─── Shorthand: with ──────────────────────────────────────────────────────
    // Fetch rows by PK and eager load relations in one step

    async with<K extends keyof R>(
        rows: T[],
        ...relations: K[]
    ): Promise<T[]> {
        if (rows.length === 0) return rows
        const pkCol = this.getPrimaryKey()
        const ids = rows.map(r => (r as Record<string, unknown>)[pkCol])
        return this.query()
            .whereIn(pkCol as keyof T & string, ids)
            .with(...(relations as (keyof R & string)[]))
            .get()
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    protected getPrimaryKey(): string {
        return getPrimaryKeyFromDef(this.def)
    }
}

// ─── Re-export types ──────────────────────────────────────────────────────────
export type { PaginateResult, OrderDirection }