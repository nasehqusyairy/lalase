import type { CascadeEvent, FieldMeta, HashFn, SqlColumnType } from './types.js'

// ─── Base Field Builder ───────────────────────────────────────────────────────

class FieldBuilder {
    protected meta: FieldMeta

    constructor(type: SqlColumnType, extra?: Partial<FieldMeta>) {
        this.meta = {
            type,
            isPrimary: false,
            isNullable: false,
            isUnique: false,
            isHidden: false,
            ...extra,
        }
    }

    primary(): this {
        this.meta.isPrimary = true
        return this
    }

    nullable(): this {
        this.meta.isNullable = true
        return this
    }

    unique(): this {
        this.meta.isUnique = true
        return this
    }

    hidden(): this {
        this.meta.isHidden = true
        return this
    }

    default(value: unknown): this {
        this.meta.defaultValue = value
        return this
    }

    foreign(): ForeignKeyBuilder {
        return new ForeignKeyBuilder({ ...this.meta })
    }

    build(): FieldMeta {
        return { ...this.meta }
    }
}

// ─── String Field Builder (supports hash) ─────────────────────────────────────

class StringFieldBuilder extends FieldBuilder {
    hash(fn?: HashFn): this {
        // default hasher will be applied at runtime via bcrypt if fn is not provided
        this.meta.hashFn = fn ?? defaultHasher
        return this
    }
}

// ─── Foreign Key Builder ──────────────────────────────────────────────────────
// Returned after calling .foreign() — enables .constrained() and blocks
// .cascadeOn() until .constrained() has been called.

class ForeignKeyBuilder {
    protected meta: FieldMeta

    constructor(meta: FieldMeta) {
        this.meta = {
            ...meta,
            foreign: { isForeign: true },
        }
    }

    nullable(): this {
        this.meta.isNullable = true
        return this
    }

    unique(): this {
        this.meta.isUnique = true
        return this
    }

    hidden(): this {
        this.meta.isHidden = true
        return this
    }

    constrained(table: string, column: string = 'id'): ConstrainedForeignKeyBuilder {
        return new ConstrainedForeignKeyBuilder({
            ...this.meta,
            foreign: {
                isForeign: true,
                referencesTable: table,
                referencesColumn: column,
            },
        })
    }

    build(): FieldMeta {
        return { ...this.meta }
    }
}

// ─── Constrained Foreign Key Builder ─────────────────────────────────────────
// Only available after .constrained() — enables .cascadeOn()
// Does NOT extend ForeignKeyBuilder to avoid its constructor resetting
// the foreign meta. Shares the same interface via duck typing.

class ConstrainedForeignKeyBuilder {
    protected meta: FieldMeta

    constructor(meta: FieldMeta) {
        this.meta = meta
    }

    nullable(): this {
        this.meta.isNullable = true
        return this
    }

    unique(): this {
        this.meta.isUnique = true
        return this
    }

    hidden(): this {
        this.meta.isHidden = true
        return this
    }

    cascadeOn(...events: CascadeEvent[]): this {
        this.meta.foreign = {
            ...this.meta.foreign!,
            cascadeOn: events,
        }

        return this
    }

    build(): FieldMeta {
        return { ...this.meta }
    }
}

// ─── Default Hasher (bcrypt) ──────────────────────────────────────────────────

const defaultHasher: HashFn = async (value: string): Promise<string> => {
    const bcrypt = await import('bcrypt')
    return bcrypt.hash(value, 10)
}

// ─── Numeric Field Builder (supports unsigned) ──────────────────────────

class NumericFieldBuilder extends FieldBuilder {
    unsigned(): this {
        this.meta.isUnsigned = true
        return this
    }
}

// ─── Field Factory ────────────────────────────────────────────────────────────

export const field = {
    // String types
    varchar: (length: number = 255) =>
        new StringFieldBuilder('varchar', { length }),

    text: () =>
        new StringFieldBuilder('text'),

    uuid: () =>
        new FieldBuilder('uuid'),

    // Numeric types
    int: () =>
        new NumericFieldBuilder('int'),

    bigint: () =>
        new NumericFieldBuilder('bigint'),

    id: () =>
        new NumericFieldBuilder('bigint').primary(),

    foreignId: () =>
        new NumericFieldBuilder('bigint').unsigned().foreign(),

    decimal: (precision: number = 8, scale: number = 2) =>
        new NumericFieldBuilder('decimal', { precision, scale }),

    float: () =>
        new NumericFieldBuilder('float'),

    // Boolean
    boolean: () =>
        new FieldBuilder('boolean'),

    // Date/Time types
    date: () =>
        new FieldBuilder('date'),

    dateTime: () =>
        new FieldBuilder('dateTime'),

    timestamp: () =>
        new FieldBuilder('timestamp'),

    // JSON types
    json: () =>
        new FieldBuilder('json'),

    jsonb: () =>
        new FieldBuilder('jsonb'),

    // Enum
    enum: (...values: string[]) =>
        new FieldBuilder('enum', { enumValues: values }),
} as const

// ─── Re-export builders for type usage ───────────────────────────────────────

export { FieldBuilder, StringFieldBuilder, ForeignKeyBuilder, ConstrainedForeignKeyBuilder }