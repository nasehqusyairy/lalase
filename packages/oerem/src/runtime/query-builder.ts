import type { Knex } from 'knex'
import type { ModelDef, RelationMeta } from '../schema/types.js'
import { applyHiddenFields, applyHiddenFieldsToMany, applyHashing } from './processor.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WhereOperator =
    | '='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'like'
    | 'ilike'
    | 'not like'

export type OrderDirection = 'asc' | 'desc'

export interface PaginateResult<T> {
    data: T[]
    total: number
    page: number
    perPage: number
    lastPage: number
}

// ─── OeremQueryBuilder ────────────────────────────────────────────────────────
// T is the full model type including relations (e.g. TUser = { id, name, ... } & RUser)
// R is the relations-only type (e.g. RUser) — used to constrain .with() keys

export class OeremQueryBuilder<T extends object, R extends object = Record<string, never>> {
    private readonly knex: Knex
    private readonly def: ModelDef
    private _relations: string[] = []
    private qb: Knex.QueryBuilder

    constructor(knex: Knex, def: ModelDef) {
        this.knex = knex
        this.def = def
        this.qb = knex(def.table)
    }

    // ─── Where ────────────────────────────────────────────────────────────────

    where(conditions: Partial<T>): this
    where(column: keyof T & string, value: unknown): this
    where(column: keyof T & string, operator: WhereOperator, value: unknown): this
    where(
        conditionsOrColumn: Partial<T> | (keyof T & string),
        operatorOrValue?: unknown,
        value?: unknown,
    ): this {
        if (typeof conditionsOrColumn === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.qb = this.qb.where(conditionsOrColumn as Record<string, any>)
        } else if (value === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.qb = (this.qb as any).where(conditionsOrColumn, operatorOrValue)
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.qb = (this.qb as any).where(conditionsOrColumn, operatorOrValue, value)
        }
        return this
    }

    whereNull(column: keyof T & string): this {
        this.qb = this.qb.whereNull(column)
        return this
    }

    whereNotNull(column: keyof T & string): this {
        this.qb = this.qb.whereNotNull(column)
        return this
    }

    whereIn(column: keyof T & string, values: unknown[]): this {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.qb = (this.qb as any).whereIn(column, values)
        return this
    }

    whereNotIn(column: keyof T & string, values: unknown[]): this {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.qb = (this.qb as any).whereNotIn(column, values)
        return this
    }

    whereBetween(column: keyof T & string, range: [unknown, unknown]): this {
        this.qb = this.qb.whereBetween(column, range as [Knex.Value, Knex.Value])
        return this
    }

    whereNotBetween(column: keyof T & string, range: [unknown, unknown]): this {
        this.qb = this.qb.whereNotBetween(column, range as [Knex.Value, Knex.Value])
        return this
    }

    orWhere(conditions: Partial<T>): this
    orWhere(column: keyof T & string, value: unknown): this
    orWhere(column: keyof T & string, operator: WhereOperator, value: unknown): this
    orWhere(
        conditionsOrColumn: Partial<T> | (keyof T & string),
        operatorOrValue?: unknown,
        value?: unknown,
    ): this {
        if (typeof conditionsOrColumn === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.qb = this.qb.orWhere(conditionsOrColumn as Record<string, any>)
        } else if (value === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.qb = (this.qb as any).orWhere(conditionsOrColumn, operatorOrValue)
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.qb = (this.qb as any).orWhere(conditionsOrColumn, operatorOrValue, value)
        }
        return this
    }

    // ─── Ordering / Limiting ──────────────────────────────────────────────────

    orderBy(column: keyof T & string, direction: OrderDirection = 'asc'): this {
        this.qb = this.qb.orderBy(column, direction)
        return this
    }

    limit(value: number): this {
        this.qb = this.qb.limit(value)
        return this
    }

    offset(value: number): this {
        this.qb = this.qb.offset(value)
        return this
    }

    select(...columns: (keyof T & string)[]): this {
        this.qb = this.qb.select(columns)
        return this
    }

    // ─── Eager loading ────────────────────────────────────────────────────────
    // R constrains which keys are valid relation names

    with(...relations: (keyof R & string)[]): this {
        this._relations.push(...relations)
        return this
    }

    // ─── Executors ────────────────────────────────────────────────────────────

    async get(): Promise<T[]> {
        const rows = await this.qb.select('*') as T[]
        const processed = applyHiddenFieldsToMany(rows, this.def)
        if (this._relations.length > 0) {
            return this.loadRelations(processed)
        }
        return processed
    }

    async first(): Promise<T | null> {
        const row = await this.qb.select('*').first() as T | undefined
        if (!row) return null
        const processed = applyHiddenFields(row, this.def)
        if (this._relations.length > 0) {
            const [result] = await this.loadRelations([processed])
            return result ?? null
        }
        return processed
    }

    async paginate(page: number, perPage: number): Promise<PaginateResult<T>> {
        const offset = (page - 1) * perPage

        const countResult = await this.qb.clone().clearSelect().clearOrder().count('* as total').first() as { total: number | string }
        const rows = await this.qb.clone().select('*').limit(perPage).offset(offset) as T[]
        const processed = applyHiddenFieldsToMany(rows, this.def)

        const data = this._relations.length > 0
            ? await this.loadRelations(processed)
            : processed

        const total = Number(countResult.total)

        return {
            data,
            total,
            page,
            perPage,
            lastPage: Math.ceil(total / perPage),
        }
    }

    async update(data: Partial<T>): Promise<number> {
        const hashed = await applyHashing(data as Record<string, unknown>, this.def)
        return this.qb.update(hashed)
    }

    async delete(): Promise<number> {
        return this.qb.delete()
    }

    async count(): Promise<number> {
        const result = await this.qb.clone().count('* as total').first() as { total: number | string }
        return Number(result.total)
    }

    // ─── Eager loading ────────────────────────────────────────────────────────

    private async loadRelations(rows: T[]): Promise<T[]> {
        if (rows.length === 0) return rows

        const result = rows.map(r => ({ ...r })) as T[]

        for (const relationKey of this._relations) {
            const relMeta = this.def.relations?.[relationKey]
            if (!relMeta) {
                throw new Error(
                    `Relation "${relationKey}" not found on model "${this.def.identifier}".`
                )
            }
            await this.loadRelation(result as Record<string, unknown>[], relationKey, relMeta)
        }

        return result
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
                    ...new Set(pivotRows.map((p: Record<string, unknown>) => p[rel.relatedForeignKey!])),
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

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private getPrimaryKey(): string {
        return getPrimaryKeyFromDef(this.def)
    }
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

export function getPrimaryKeyFromDef(def: ModelDef): string {
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