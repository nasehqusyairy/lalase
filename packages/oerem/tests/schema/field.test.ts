import { describe, it, expect, vi } from 'vitest'
import { field, ForeignKeyBuilder, ConstrainedForeignKeyBuilder } from '../../src/schema/field.js'
import { hasMany, hasOne, belongsTo, belongsToMany } from '../../src/schema/relations.js'
import type { FieldMeta } from '../../src/schema/types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function build(f: { build(): FieldMeta }): FieldMeta {
    return f.build()
}

// ─── field.varchar ────────────────────────────────────────────────────────────

describe('field.varchar', () => {
    it('creates a varchar field with default length 255', () => {
        const f = build(field.varchar())
        expect(f.type).toBe('varchar')
        expect(f.length).toBe(255)
    })

    it('creates a varchar field with custom length', () => {
        const f = build(field.varchar(100))
        expect(f.length).toBe(100)
    })

    it('defaults: not nullable, not unique, not primary, not hidden', () => {
        const f = build(field.varchar())
        expect(f.isNullable).toBe(false)
        expect(f.isUnique).toBe(false)
        expect(f.isPrimary).toBe(false)
        expect(f.isHidden).toBe(false)
    })

    it('.nullable() sets isNullable', () => {
        const f = build(field.varchar().nullable())
        expect(f.isNullable).toBe(true)
    })

    it('.unique() sets isUnique', () => {
        const f = build(field.varchar().unique())
        expect(f.isUnique).toBe(true)
    })

    it('.primary() sets isPrimary', () => {
        const f = build(field.varchar().primary())
        expect(f.isPrimary).toBe(true)
    })

    it('.hidden() sets isHidden', () => {
        const f = build(field.varchar().hidden())
        expect(f.isHidden).toBe(true)
    })

    it('.default() sets defaultValue', () => {
        const f = build(field.varchar().default('guest'))
        expect(f.defaultValue).toBe('guest')
    })

    it('.hash() sets hashFn to provided function', () => {
        const myHash = (v: string) => `hashed_${v}`
        const f = build(field.varchar().hash(myHash))
        expect(f.hashFn).toBe(myHash)
    })

    it('.hash() without argument sets a default hashFn', () => {
        const f = build(field.varchar().hash())
        expect(typeof f.hashFn).toBe('function')
    })

    it('.hash().hidden() chains correctly', () => {
        const f = build(field.varchar().hash().hidden())
        expect(f.hashFn).toBeDefined()
        expect(f.isHidden).toBe(true)
    })
})

// ─── field.text ───────────────────────────────────────────────────────────────

describe('field.text', () => {
    it('creates a text field', () => {
        expect(build(field.text()).type).toBe('text')
    })

    it('supports .hash()', () => {
        const f = build(field.text().hash())
        expect(f.hashFn).toBeDefined()
    })
})

// ─── field.integer ────────────────────────────────────────────────────────────

describe('field.integer', () => {
    it('creates an integer field', () => {
        expect(build(field.integer()).type).toBe('integer')
    })

    it('.primary() works', () => {
        expect(build(field.integer().primary()).isPrimary).toBe(true)
    })
})

// ─── field.bigInteger ─────────────────────────────────────────────────────────

describe('field.bigInteger', () => {
    it('creates a bigInteger field', () => {
        expect(build(field.bigInteger()).type).toBe('bigInteger')
    })
})

// ─── field.boolean ────────────────────────────────────────────────────────────

describe('field.boolean', () => {
    it('creates a boolean field', () => {
        expect(build(field.boolean()).type).toBe('boolean')
    })

    it('.default(true) works', () => {
        expect(build(field.boolean().default(true)).defaultValue).toBe(true)
    })
})

// ─── field.decimal ────────────────────────────────────────────────────────────

describe('field.decimal', () => {
    it('creates a decimal field with default precision and scale', () => {
        const f = build(field.decimal())
        expect(f.type).toBe('decimal')
        expect(f.precision).toBe(8)
        expect(f.scale).toBe(2)
    })

    it('accepts custom precision and scale', () => {
        const f = build(field.decimal(10, 4))
        expect(f.precision).toBe(10)
        expect(f.scale).toBe(4)
    })
})

// ─── field.uuid ───────────────────────────────────────────────────────────────

describe('field.uuid', () => {
    it('creates a uuid field', () => {
        expect(build(field.uuid()).type).toBe('uuid')
    })

    it('can be used as primary key', () => {
        expect(build(field.uuid().primary()).isPrimary).toBe(true)
    })
})

// ─── field.date / dateTime / timestamp ───────────────────────────────────────

describe('date fields', () => {
    it('field.date() creates a date field', () => {
        expect(build(field.date()).type).toBe('date')
    })

    it('field.dateTime() creates a dateTime field', () => {
        expect(build(field.dateTime()).type).toBe('dateTime')
    })

    it('field.timestamp() creates a timestamp field', () => {
        expect(build(field.timestamp()).type).toBe('timestamp')
    })
})

// ─── field.json / jsonb ───────────────────────────────────────────────────────

describe('json fields', () => {
    it('field.json() creates a json field', () => {
        expect(build(field.json()).type).toBe('json')
    })

    it('field.jsonb() creates a jsonb field', () => {
        expect(build(field.jsonb()).type).toBe('jsonb')
    })
})

// ─── field.enum ───────────────────────────────────────────────────────────────

describe('field.enum', () => {
    it('creates an enum field with values', () => {
        const f = build(field.enum('admin', 'user', 'guest'))
        expect(f.type).toBe('enum')
        expect(f.enumValues).toEqual(['admin', 'user', 'guest'])
    })
})

// ─── .foreign() chain ─────────────────────────────────────────────────────────

describe('.foreign() chain', () => {
    it('.foreign() returns a ForeignKeyBuilder', () => {
        const builder = field.integer().foreign()
        expect(builder).toBeInstanceOf(ForeignKeyBuilder)
    })

    it('.foreign() sets isForeign on meta', () => {
        const f = field.integer().foreign().build()
        expect(f.foreign?.isForeign).toBe(true)
    })

    it('.constrained() returns a ConstrainedForeignKeyBuilder', () => {
        const builder = field.integer().foreign().constrained('users')
        expect(builder).toBeInstanceOf(ConstrainedForeignKeyBuilder)
    })

    it('.constrained() sets referencesTable and defaults column to id', () => {
        const f = field.integer().foreign().constrained('users').build()
        expect(f.foreign?.referencesTable).toBe('users')
        expect(f.foreign?.referencesColumn).toBe('id')
    })

    it('.constrained() accepts a custom column', () => {
        const f = field.integer().foreign().constrained('users', 'uuid').build()
        expect(f.foreign?.referencesColumn).toBe('uuid')
    })

    it('.cascadeOn() sets cascade events', () => {
        const f = field.integer().foreign().constrained('users').cascadeOn('delete', 'update').build()
        expect(f.foreign?.cascadeOn).toEqual(['delete', 'update'])
    })

    it('.cascadeOn() with single event works', () => {
        const f = field.integer().foreign().constrained('users').cascadeOn('delete').build()
        expect(f.foreign?.cascadeOn).toEqual(['delete'])
    })

    it('.foreign() without .constrained() cannot call .cascadeOn()', () => {
        // ForeignKeyBuilder does not have cascadeOn method
        const builder = field.integer().foreign()
        expect((builder as unknown as Record<string, unknown>).cascadeOn).toBeUndefined()
    })

    it('.foreign() supports .nullable() and .unique()', () => {
        const f = field.integer().foreign().constrained('users').nullable().unique().build()
        expect(f.isNullable).toBe(true)
        expect(f.isUnique).toBe(true)
    })
})

// ─── Relations ────────────────────────────────────────────────────────────────

describe('relations', () => {
    const fakeModel = { identifier: 'Post', table: 'posts', schema: {} }
    const fakeModel2 = { identifier: 'Role', table: 'roles', schema: {} }

    describe('hasMany', () => {
        it('returns correct relation meta', () => {
            const rel = hasMany(() => fakeModel, 'user_id')
            expect(rel.type).toBe('hasMany')
            expect(rel.foreignKey).toBe('user_id')
            expect(rel.ref()).toBe(fakeModel)
        })
    })

    describe('hasOne', () => {
        it('returns correct relation meta', () => {
            const rel = hasOne(() => fakeModel, 'user_id')
            expect(rel.type).toBe('hasOne')
            expect(rel.foreignKey).toBe('user_id')
            expect(rel.ref()).toBe(fakeModel)
        })
    })

    describe('belongsTo', () => {
        it('returns correct relation meta', () => {
            const rel = belongsTo(() => fakeModel, 'user_id')
            expect(rel.type).toBe('belongsTo')
            expect(rel.foreignKey).toBe('user_id')
            expect(rel.ref()).toBe(fakeModel)
        })
    })

    describe('belongsToMany', () => {
        it('returns correct relation meta', () => {
            const rel = belongsToMany(() => fakeModel2, 'user_roles', 'user_id', 'role_id')
            expect(rel.type).toBe('belongsToMany')
            expect(rel.pivotTable).toBe('user_roles')
            expect(rel.foreignKey).toBe('user_id')
            expect(rel.relatedForeignKey).toBe('role_id')
            expect(rel.ref()).toBe(fakeModel2)
        })
    })

    it('lazy ref is not called at definition time', () => {
        const refFn = vi.fn(() => fakeModel)
        hasMany(refFn, 'user_id')
        expect(refFn).not.toHaveBeenCalled()
    })

    it('lazy ref is called when accessed', () => {
        const refFn = vi.fn(() => fakeModel)
        const rel = hasMany(refFn, 'user_id')
        rel.ref()
        expect(refFn).toHaveBeenCalledOnce()
    })
})

// ─── Default bcrypt hasher ────────────────────────────────────────────────────

describe('default bcrypt hasher', () => {
    it('hashes a string asynchronously', async () => {
        const f = build(field.varchar().hash())
        const result = await f.hashFn!('secret')
        expect(typeof result).toBe('string')
        expect(result).not.toBe('secret')
        expect(result.length).toBeGreaterThan(20)
    })

    it('custom hash function is used instead of bcrypt', async () => {
        const customHash = vi.fn((v: string) => `custom_${v}`)
        const f = build(field.varchar().hash(customHash))
        const result = await f.hashFn!('secret')
        expect(customHash).toHaveBeenCalledWith('secret')
        expect(result).toBe('custom_secret')
    })
})