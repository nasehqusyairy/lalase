import type { Knex } from 'knex'
import type { ModelDef, RelationMeta } from '../schema/types.js'
import { OeremQueryBuilder, getPrimaryKeyFromDef } from './query-builder.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PivotId = number | string

export type AttachItem =
    | PivotId
    | { id: PivotId;[extra: string]: unknown }

export type SyncItem =
    | PivotId
    | { id: PivotId;[extra: string]: unknown }

export interface SyncOptions {
    /** If true, update extra columns for existing pivot rows. Default: false */
    update?: boolean
}

// ─── PivotRelation ────────────────────────────────────────────────────────────

export class PivotRelation<TRelated extends object, RRelated extends object = Record<string, never>> {
    private readonly knex: Knex
    private readonly ownerDef: ModelDef
    private readonly relMeta: RelationMeta
    private readonly relatedDef: ModelDef
    private readonly ownerId: PivotId

    constructor(
        knex: Knex,
        ownerDef: ModelDef,
        relMeta: RelationMeta,
        ownerId: PivotId,
    ) {
        if (relMeta.type !== 'belongsToMany') {
            throw new Error(
                `through() can only be used with belongsToMany relations. ` +
                `"${relMeta.type}" is not supported.`
            )
        }

        if (!relMeta.pivotTable || !relMeta.relatedForeignKey) {
            throw new Error(
                `belongsToMany relation is missing "pivotTable" or "relatedForeignKey".`
            )
        }

        this.knex = knex
        this.ownerDef = ownerDef
        this.relMeta = relMeta
        this.relatedDef = relMeta.ref()
        this.ownerId = ownerId
    }

    // ─── Pivot table helpers ──────────────────────────────────────────────────

    private get pivotTable(): string {
        return this.relMeta.pivotTable!
    }

    private get fk(): string {
        return this.relMeta.foreignKey
    }

    private get rfk(): string {
        return this.relMeta.relatedForeignKey!
    }

    private pivotQb(): Knex.QueryBuilder {
        return this.knex(this.pivotTable)
    }

    private ownerCondition(): Record<string, unknown> {
        return { [this.fk]: this.ownerId }
    }

    // ─── Normalize attach/sync items ──────────────────────────────────────────

    private normalizeItems(items: AttachItem | AttachItem[]): { id: PivotId; extra: Record<string, unknown> }[] {
        const arr = Array.isArray(items) ? items : [items]
        return arr.map(item => {
            if (typeof item === 'object' && item !== null && 'id' in item) {
                const { id, ...extra } = item as { id: PivotId;[k: string]: unknown }
                return { id, extra }
            }
            return { id: item as PivotId, extra: {} }
        })
    }

    // ─── attach ───────────────────────────────────────────────────────────────

    async attach(items: AttachItem | AttachItem[]): Promise<void> {
        const normalized = this.normalizeItems(items)

        const rows = normalized.map(({ id, extra }) => ({
            [this.fk]: this.ownerId,
            [this.rfk]: id,
            ...extra,
        }))

        await this.pivotQb().insert(rows)
    }

    // ─── detach ───────────────────────────────────────────────────────────────

    async detach(ids: PivotId | PivotId[]): Promise<number> {
        const arr = Array.isArray(ids) ? ids : [ids]
        return this.pivotQb()
            .where(this.ownerCondition())
            .whereIn(this.rfk, arr)
            .delete()
    }

    async detachAll(): Promise<number> {
        return this.pivotQb()
            .where(this.ownerCondition())
            .delete()
    }

    // ─── sync ─────────────────────────────────────────────────────────────────
    // Attach what's not there, detach what's not in the list.

    async sync(items: SyncItem | SyncItem[], options: SyncOptions = {}): Promise<{
        attached: PivotId[]
        detached: PivotId[]
        updated: PivotId[]
    }> {
        const normalized = this.normalizeItems(
            Array.isArray(items) ? items : [items]
        )
        const desiredIds = normalized.map(n => n.id)

        // Current pivot rows
        const existing = await this.pivotQb()
            .where(this.ownerCondition())
            .select(this.rfk) as Record<string, unknown>[]

        const existingIds = existing.map(r => r[this.rfk] as PivotId)

        // Ids to attach (in desired but not in existing)
        const toAttach = normalized.filter(n => !existingIds.includes(n.id))
        // Ids to detach (in existing but not in desired)
        const toDetach = existingIds.filter(id => !desiredIds.includes(id))
        // Ids to potentially update (in both)
        const toUpdate = options.update
            ? normalized.filter(n => existingIds.includes(n.id) && Object.keys(n.extra).length > 0)
            : []

        const attached: PivotId[] = []
        const detached: PivotId[] = []
        const updated: PivotId[] = []

        if (toAttach.length > 0) {
            await this.attach(toAttach.map(n => ({ id: n.id, ...n.extra })))
            attached.push(...toAttach.map(n => n.id))
        }

        if (toDetach.length > 0) {
            await this.detach(toDetach)
            detached.push(...toDetach)
        }

        for (const { id, extra } of toUpdate) {
            await this.pivotQb()
                .where({ ...this.ownerCondition(), [this.rfk]: id })
                .update(extra)
            updated.push(id)
        }

        return { attached, detached, updated }
    }

    // ─── toggle ───────────────────────────────────────────────────────────────
    // Attach if not present, detach if present.

    async toggle(id: PivotId, extra: Record<string, unknown> = {}): Promise<'attached' | 'detached'> {
        const exists = await this.has(id)
        if (exists) {
            await this.detach(id)
            return 'detached'
        } else {
            await this.attach(extra ? { id, ...extra } : id)
            return 'attached'
        }
    }

    // ─── has ──────────────────────────────────────────────────────────────────

    async has(id: PivotId): Promise<boolean> {
        const row = await this.pivotQb()
            .where({ ...this.ownerCondition(), [this.rfk]: id })
            .first()
        return row !== undefined
    }

    // ─── query ────────────────────────────────────────────────────────────────
    // Returns a QueryBuilder scoped to the related model,
    // already filtered to only include rows related to this owner.

    query(): OeremQueryBuilder<TRelated, RRelated> {
        const relatedPkCol = getPrimaryKeyFromDef(this.relatedDef)
        const pivotTable = this.pivotTable
        const rfk = this.rfk
        const fk = this.fk
        const ownerId = this.ownerId
        const knex = this.knex

        // Subquery: SELECT role_id FROM user_roles WHERE user_id = ?
        const subquery = knex(pivotTable).where({ [fk]: ownerId }).select(rfk)

        const qb = new OeremQueryBuilder<TRelated, RRelated>(knex, this.relatedDef)
        qb._whereInRaw(relatedPkCol, subquery as unknown as (string | number)[])
        return qb
    }

    // ─── count ────────────────────────────────────────────────────────────────

    async count(): Promise<number> {
        const result = await this.pivotQb()
            .where(this.ownerCondition())
            .count('* as total')
            .first() as { total: number | string }
        return Number(result.total)
    }
}