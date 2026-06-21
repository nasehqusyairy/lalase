import type { FieldMeta, ModelDef, CascadeEvent } from '../../schema/types.js'

// ─── Snapshot Types ───────────────────────────────────────────────────────────
// A serializable (JSON-safe) representation of the schema at a point in time.
// We strip functions (hashFn) since they can't be serialized.

export interface SnapshotFieldMeta {
    type: string
    length?: number
    enumValues?: string[]
    precision?: number
    scale?: number
    isPrimary: boolean
    isNullable: boolean
    isUnique: boolean
    isHidden: boolean
    defaultValue?: unknown
    foreign?: {
        isForeign: true
        referencesTable?: string
        referencesColumn?: string
        cascadeOn?: CascadeEvent[]
    }
    // hashFn is intentionally excluded — not serializable
}

export interface SnapshotModel {
    identifier: string
    table: string
    schema: Record<string, SnapshotFieldMeta>
}

export interface SchemaSnapshot {
    version: number
    createdAt: string
    models: SnapshotModel[]
}

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeModel(def: ModelDef): SnapshotModel {
    const schema: Record<string, SnapshotFieldMeta> = {}

    for (const [col, meta] of Object.entries(def.schema)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashFn, ...rest } = meta
        schema[col] = rest as SnapshotFieldMeta
    }

    return {
        identifier: def.identifier,
        table: def.table,
        schema,
    }
}

export function createSnapshot(models: ModelDef[]): SchemaSnapshot {
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        models: models.map(serializeModel),
    }
}

// ─── Diff Types ───────────────────────────────────────────────────────────────

export type ColumnChangeType =
    | 'added'
    | 'removed'
    | 'type_changed'
    | 'nullable_changed'
    | 'unique_changed'
    | 'default_changed'
    | 'foreign_changed'

export interface ColumnChange {
    column: string
    changeType: ColumnChangeType
    before?: SnapshotFieldMeta
    after?: SnapshotFieldMeta
}

export type TableChangeType = 'created' | 'dropped' | 'altered'

export interface TableDiff {
    table: string
    identifier: string
    changeType: TableChangeType
    columnChanges: ColumnChange[]
}

export interface SchemaDiff {
    hasChanges: boolean
    tableDiffs: TableDiff[]
}

// ─── Diffing ──────────────────────────────────────────────────────────────────

export function diffSchemas(
    previous: SchemaSnapshot,
    current: SchemaSnapshot,
): SchemaDiff {
    const tableDiffs: TableDiff[] = []

    const prevByTable = Object.fromEntries(previous.models.map(m => [m.table, m]))
    const currByTable = Object.fromEntries(current.models.map(m => [m.table, m]))

    // ── Tables in current but not in previous → created ───────────────────────
    for (const [table, currModel] of Object.entries(currByTable)) {
        if (!prevByTable[table]) {
            tableDiffs.push({
                table,
                identifier: currModel.identifier,
                changeType: 'created',
                columnChanges: Object.entries(currModel.schema).map(([col, meta]) => ({
                    column: col,
                    changeType: 'added',
                    after: meta,
                })),
            })
        }
    }

    // ── Tables in previous but not in current → dropped ───────────────────────
    for (const [table, prevModel] of Object.entries(prevByTable)) {
        if (!currByTable[table]) {
            tableDiffs.push({
                table,
                identifier: prevModel.identifier,
                changeType: 'dropped',
                columnChanges: [],
            })
        }
    }

    // ── Tables in both → check for column changes ─────────────────────────────
    for (const [table, currModel] of Object.entries(currByTable)) {
        const prevModel = prevByTable[table]
        if (!prevModel) continue

        const columnChanges: ColumnChange[] = []

        // Columns added
        for (const [col, currMeta] of Object.entries(currModel.schema)) {
            if (!prevModel.schema[col]) {
                columnChanges.push({ column: col, changeType: 'added', after: currMeta })
                continue
            }

            const prevMeta = prevModel.schema[col]
            const changes = detectColumnChanges(col, prevMeta, currMeta)
            columnChanges.push(...changes)
        }

        // Columns removed
        for (const col of Object.keys(prevModel.schema)) {
            if (!currModel.schema[col]) {
                columnChanges.push({
                    column: col,
                    changeType: 'removed',
                    before: prevModel.schema[col],
                })
            }
        }

        if (columnChanges.length > 0) {
            tableDiffs.push({
                table,
                identifier: currModel.identifier,
                changeType: 'altered',
                columnChanges,
            })
        }
    }

    return {
        hasChanges: tableDiffs.length > 0,
        tableDiffs,
    }
}

function detectColumnChanges(
    column: string,
    prev: SnapshotFieldMeta,
    curr: SnapshotFieldMeta,
): ColumnChange[] {
    const changes: ColumnChange[] = []

    if (prev.type !== curr.type || prev.length !== curr.length ||
        prev.precision !== curr.precision || prev.scale !== curr.scale ||
        JSON.stringify(prev.enumValues) !== JSON.stringify(curr.enumValues)) {
        changes.push({ column, changeType: 'type_changed', before: prev, after: curr })
        return changes // type change supersedes other changes for this column
    }

    if (prev.isNullable !== curr.isNullable) {
        changes.push({ column, changeType: 'nullable_changed', before: prev, after: curr })
    }

    if (prev.isUnique !== curr.isUnique) {
        changes.push({ column, changeType: 'unique_changed', before: prev, after: curr })
    }

    if (JSON.stringify(prev.defaultValue) !== JSON.stringify(curr.defaultValue)) {
        changes.push({ column, changeType: 'default_changed', before: prev, after: curr })
    }

    if (JSON.stringify(prev.foreign) !== JSON.stringify(curr.foreign)) {
        changes.push({ column, changeType: 'foreign_changed', before: prev, after: curr })
    }

    return changes
}