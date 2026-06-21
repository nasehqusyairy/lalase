// ─── SQL Column Types ────────────────────────────────────────────────────────

export type SqlColumnType =
    | 'varchar'
    | 'text'
    | 'integer'
    | 'bigInteger'
    | 'boolean'
    | 'date'
    | 'dateTime'
    | 'timestamp'
    | 'decimal'
    | 'float'
    | 'json'
    | 'jsonb'
    | 'uuid'
    | 'enum'

// ─── Cascade Events ───────────────────────────────────────────────────────────

export type CascadeEvent = 'update' | 'delete'

// ─── Foreign Key Metadata ─────────────────────────────────────────────────────

export interface ForeignKeyMeta {
    isForeign: true
    referencesTable?: string
    referencesColumn?: string
    cascadeOn?: CascadeEvent[]
}

// ─── Hash Function ────────────────────────────────────────────────────────────

export type HashFn = (value: string) => string | Promise<string>

// ─── Field Metadata ───────────────────────────────────────────────────────────

export interface FieldMeta {
    type: SqlColumnType

    // varchar / enum args
    length?: number
    enumValues?: string[]

    // decimal args
    precision?: number
    scale?: number

    // constraints
    isPrimary: boolean
    isNullable: boolean
    isUnique: boolean
    isHidden: boolean
    defaultValue?: unknown

    // foreign key
    foreign?: ForeignKeyMeta

    // hashing
    hashFn?: HashFn
}

// ─── Relation Types ───────────────────────────────────────────────────────────

export type RelationType = 'hasMany' | 'hasOne' | 'belongsTo' | 'belongsToMany'

export interface RelationMeta {
    type: RelationType
    ref: () => AnyModelDef
    foreignKey: string
    // belongsToMany only
    pivotTable?: string
    relatedForeignKey?: string
}

// ─── Model Definition ─────────────────────────────────────────────────────────

export interface ModelDef {
    identifier: string
    table: string
    schema: Record<string, FieldMeta>
    relations?: Record<string, RelationMeta>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyModelDef = ModelDef & { schema: Record<string, any> }

// ─── Oerem Config ─────────────────────────────────────────────────────────────

export interface OeremConfig {
    knex: import('knex').Knex.Config
    inputFolder: string
    outputFolder: string
    poolFile: string
    migrationsFolder: string
}

// ─── Type Inference Helpers ───────────────────────────────────────────────────

type SqlTypeToTs<T extends SqlColumnType> =
    T extends 'varchar' | 'text' | 'uuid' ? string :
    T extends 'integer' | 'bigInteger' | 'decimal' | 'float' ? number :
    T extends 'boolean' ? boolean :
    T extends 'date' | 'dateTime' | 'timestamp' ? Date :
    T extends 'json' | 'jsonb' ? unknown :
    T extends 'enum' ? string :
    never

type InferField<F extends FieldMeta> =
    F['isNullable'] extends true
    ? SqlTypeToTs<F['type']> | null
    : SqlTypeToTs<F['type']>

export type InferSchema<S extends Record<string, FieldMeta>> = {
    [K in keyof S]: InferField<S[K]>
}