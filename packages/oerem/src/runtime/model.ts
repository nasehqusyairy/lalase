import type { Knex } from 'knex'
import type { ModelDef, RelationMeta } from '../schema/types.js'
import { applyHiddenFields, applyHiddenFieldsToMany, applyHashing } from './processor.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginateResult<T> {
    data: T[]
    total: number
    page: number
    perPage: number
    lastPage: number
}

export type OrderDirection = 'asc' | 'desc'

// ─── OeremModel ───────────────────────────────────────────────────────────────

export class OeremModel<T extends object, R extends object> {
    private readonly knex: Knex
    readonly def: ModelDef

    constructor(knex: Knex, def: ModelDef) {
        this.knex = knex
        this.def = def
    }

    // ── Internal query builder ─────────────────────────────────────────────────

    private qb(): Knex.QueryBuilder {
        return this.knex(this.def.table)
    }

    // ── Post-process rows ──────────────────────────────────────────────────────

    private process(row: T): T {
        return applyHiddenFields(row, this.def)
    }

    private processMany(rows: T[]): T[] {
        return applyHiddenFieldsToMany(rows, this.def)
    }

    // ─── Find ──────────────────────────────────────────────────────────────────

    async findMany(
        where?: Partial<T>,
        options?: {
            orderBy?: { column: keyof T; direction?: OrderDirection }
            limit?: number
            offset?: number
        }
    ): Promise<T[]> {
        let q = this.qb().select('*')

        if (where) q = q.where(where as Record<string, unknown>)
        if (options?.orderBy) {
            q = q.orderBy(options.orderBy.column as string, options.orderBy.direction ?? 'asc')
        }
        if (options?.limit !== undefined) q = q.limit(options.limit)
        if (options?.offset !== undefined) q = q.offset(options.offset)

        const rows = await q as T[]
        return this.processMany(rows)
    }

    async findOne(where: Partial<T>): Promise<T | null> {
        const row = await this.qb()
            .select('*')
            .where(where as Record<string, unknown>)
            .first() as T | undefined

        return row ? this.process(row) : null
    }

    async findById(id: number | string): Promise<T | null> {
        const pkColumn = this.getPrimaryKey()
        const row = await this.qb()
            .select('*')
            .where({ [pkColumn]: id })
            .first() as T | undefined

        return row ? this.process(row) : null
    }

    // ─── Insert ────────────────────────────────────────────────────────────────

    async insert(data: Partial<T>): Promise<T> {
        const hashed = await applyHashing(data as Record<string, unknown>, this.def)
        const pkColumn = this.getPrimaryKey()

        const [id] = await this.qb().insert(hashed)
        const row = await this.findById(id ?? (hashed[pkColumn] as number | string))

        if (!row) throw new Error(`Insert succeeded but could not retrieve the created row.`)
        return row
    }

    async insertMany(rows: Partial<T>[]): Promise<void> {
        const hashed = await Promise.all(
            rows.map(r => applyHashing(r as Record<string, unknown>, this.def))
        )
        await this.qb().insert(hashed)
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    async update(where: Partial<T>, data: Partial<T>): Promise<number> {
        const hashed = await applyHashing(data as Record<string, unknown>, this.def)
        return this.qb()
            .where(where as Record<string, unknown>)
            .update(hashed)
    }

    async updateById(id: number | string, data: Partial<T>): Promise<T | null> {
        const pkColumn = this.getPrimaryKey()
        const hashed = await applyHashing(data as Record<string, unknown>, this.def)

        await this.qb()
            .where({ [pkColumn]: id })
            .update(hashed)

        return this.findById(id)
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    async delete(where: Partial<T>): Promise<number> {
        return this.qb()
            .where(where as Record<string, unknown>)
            .delete()
    }

    async deleteById(id: number | string): Promise<number> {
        const pkColumn = this.getPrimaryKey()
        return this.qb()
            .where({ [pkColumn]: id })
            .delete()
    }

    // ─── Paginate ──────────────────────────────────────────────────────────────

    async paginate(
        page: number,
        perPage: number,
        where?: Partial<T>,
    ): Promise<PaginateResult<T>> {
        const offset = (page - 1) * perPage

        let countQ = this.qb().count('* as total')
        let dataQ = this.qb().select('*').limit(perPage).offset(offset)

        if (where) {
            countQ = countQ.where(where as Record<string, unknown>)
            dataQ = dataQ.where(where as Record<string, unknown>)
        }

        const [{ total }, rows] = await Promise.all([
            countQ.first() as Promise<{ total: number | string }>,
            dataQ as Promise<T[]>,
        ])

        const totalNum = Number(total)

        return {
            data: this.processMany(rows),
            total: totalNum,
            page,
            perPage,
            lastPage: Math.ceil(totalNum / perPage),
        }
    }

    // ─── Eager loading ─────────────────────────────────────────────────────────

    async with<K extends keyof R>(
        rows: T[],
        ...relations: K[]
    ): Promise<(T & Pick<R, K>)[]> {
        if (rows.length === 0) return rows as (T & Pick<R, K>)[]

        const result = rows.map(r => ({ ...r })) as (T & Pick<R, K>)[]

        for (const relationKey of relations) {
            const relMeta = this.def.relations?.[relationKey as string]
            if (!relMeta) {
                throw new Error(
                    `Relation "${String(relationKey)}" not found on model "${this.def.identifier}".`
                )
            }
            await this.loadRelation(result as Record<string, unknown>[], relationKey as string, relMeta)
        }

        return this.processMany(result as T[]) as (T & Pick<R, K>)[]
    }

    private async loadRelation(
        rows: Record<string, unknown>[],
        key: string,
        rel: RelationMeta,
    ): Promise<void> {
        const relatedDef = rel.ref()

        switch (rel.type) {
            case 'hasMany': {
                const pkCol = this.getPrimaryKey()
                const ids = [...new Set(rows.map(r => r[pkCol]))]
                const related = await this.knex(relatedDef.table)
                    .whereIn(rel.foreignKey, ids as (string | number)[])
                const grouped = groupBy(related, rel.foreignKey)

                for (const row of rows) {
                    row[key] = grouped[String(row[pkCol])] ?? []
                }
                break
            }

            case 'hasOne': {
                const pkCol = this.getPrimaryKey()
                const ids = [...new Set(rows.map(r => r[pkCol]))]
                const related = await this.knex(relatedDef.table)
                    .whereIn(rel.foreignKey, ids as (string | number)[])
                const indexed = indexBy(related, rel.foreignKey)

                for (const row of rows) {
                    row[key] = indexed[String(row[pkCol])] ?? null
                }
                break
            }

            case 'belongsTo': {
                const fkValues = [...new Set(rows.map(r => r[rel.foreignKey]))]
                const pkCol = getPrimaryKeyFromDef(relatedDef)
                const related = await this.knex(relatedDef.table)
                    .whereIn(pkCol, fkValues as (string | number)[])
                const indexed = indexBy(related, pkCol)

                for (const row of rows) {
                    row[key] = indexed[String(row[rel.foreignKey])] ?? null
                }
                break
            }

            case 'belongsToMany': {
                if (!rel.pivotTable || !rel.relatedForeignKey) {
                    throw new Error(
                        `belongsToMany relation "${key}" is missing pivotTable or relatedForeignKey.`
                    )
                }

                const pkCol = this.getPrimaryKey()
                const ids = [...new Set(rows.map(r => r[pkCol]))]

                const pivotRows = await this.knex(rel.pivotTable)
                    .whereIn(rel.foreignKey, ids as (string | number)[])

                const relatedIds = [
                    ...new Set(
                        pivotRows.map((p: Record<string, unknown>) => p[rel.relatedForeignKey!])
                    ),
                ]
                const relatedPkCol = getPrimaryKeyFromDef(relatedDef)
                const related = await this.knex(relatedDef.table)
                    .whereIn(relatedPkCol, relatedIds as (string | number)[])

                const relatedById = indexBy(related, relatedPkCol)

                const grouped: Record<string, unknown[]> = {}
                for (const pivot of pivotRows as Record<string, unknown>[]) {
                    const ownerId = String(pivot[rel.foreignKey])
                    const relatedId = String(pivot[rel.relatedForeignKey!])
                    if (!grouped[ownerId]) grouped[ownerId] = []
                    const relatedRow = relatedById[relatedId]
                    if (relatedRow) grouped[ownerId].push(relatedRow)
                }

                for (const row of rows) {
                    row[key] = grouped[String(row[pkCol])] ?? []
                }
                break
            }
        }
    }

    // ─── Raw access ────────────────────────────────────────────────────────────

    raw(sql: string, bindings?: Knex.RawBinding): Knex.Raw {
        return this.knex.raw(sql, bindings as Knex.RawBinding)
    }

    query(): Knex.QueryBuilder {
        return this.qb()
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private getPrimaryKey(): string {
        return getPrimaryKeyFromDef(this.def)
    }
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

function getPrimaryKeyFromDef(def: ModelDef): string {
    const pk = Object.entries(def.schema).find(([, meta]) => meta.isPrimary)
    if (!pk) throw new Error(`Model "${def.identifier}" has no primary key defined.`)
    return pk[0]
}

function groupBy(
    rows: Record<string, unknown>[],
    key: string,
): Record<string, Record<string, unknown>[]> {
    const result: Record<string, Record<string, unknown>[]> = {}
    for (const row of rows) {
        const k = String(row[key])
        if (!result[k]) result[k] = []
        result[k].push(row)
    }
    return result
}

function indexBy(
    rows: Record<string, unknown>[],
    key: string,
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}
    for (const row of rows) {
        result[String(row[key])] = row
    }
    return result
}