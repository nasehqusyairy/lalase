import { describe, it, expect, vi } from 'vitest'
import { applyHiddenFields, applyHiddenFieldsToMany, applyHashing } from '../../src/runtime/processor.js'
import { field } from '../../src/schema/field.js'
import type { ModelDef } from '../../src/schema/types.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const def: ModelDef = {
    identifier: 'User',
    table: 'users',
    schema: {
        id: field.id().build(),
        name: field.varchar().build(),
        password: field.varchar().hash().hidden().build(),
        secret: field.varchar().hidden().build(),
    },
}

// ─── applyHiddenFields ──────────────────────────────────────────────────────────────

describe('applyHiddenFields', () => {
    it('makes hidden fields non-enumerable', () => {
        const obj = { id: 1, name: 'Alice', password: 'hash', secret: 'shh' }
        const result = applyHiddenFields(obj, def)

        expect(Object.getOwnPropertyDescriptor(result, 'password')?.enumerable).toBe(false)
        expect(Object.getOwnPropertyDescriptor(result, 'secret')?.enumerable).toBe(false)
    })

    it('hidden fields are still directly accessible', () => {
        const obj = { id: 1, name: 'Alice', password: 'hash', secret: 'shh' }
        const result = applyHiddenFields(obj, def)

        expect(result.password).toBe('hash')
        expect(result.secret).toBe('shh')
    })

    it('hidden fields are excluded from JSON.stringify()', () => {
        const obj = { id: 1, name: 'Alice', password: 'hash', secret: 'shh' }
        const result = applyHiddenFields(obj, def)
        const json = JSON.parse(JSON.stringify(result))

        expect(json).not.toHaveProperty('password')
        expect(json).not.toHaveProperty('secret')
        expect(json.name).toBe('Alice')
    })

    it('hidden fields are excluded from object spread', () => {
        const obj = { id: 1, name: 'Alice', password: 'hash', secret: 'shh' }
        const result = applyHiddenFields(obj, def)
        const spread = { ...result }

        expect(spread).not.toHaveProperty('password')
        expect(spread).not.toHaveProperty('secret')
    })

    it('non-hidden fields remain enumerable', () => {
        const obj = { id: 1, name: 'Alice', password: 'hash', secret: 'shh' }
        const result = applyHiddenFields(obj, def)

        expect(Object.getOwnPropertyDescriptor(result, 'id')?.enumerable).toBe(true)
        expect(Object.getOwnPropertyDescriptor(result, 'name')?.enumerable).toBe(true)
    })

    it('does not throw if hidden field is missing from object', () => {
        const obj = { id: 1, name: 'Alice' }
        expect(() => applyHiddenFields(obj as never, def)).not.toThrow()
    })

    it('returns the same object reference (mutates in place)', () => {
        const obj = { id: 1, name: 'Alice', password: 'hash', secret: 'shh' }
        const result = applyHiddenFields(obj, def)
        expect(result).toBe(obj)
    })
})

// ─── applyHiddenFieldsToMany ──────────────────────────────────────────────────

describe('applyHiddenFieldsToMany', () => {
    it('applies hidden fields to all rows', () => {
        const rows = [
            { id: 1, name: 'Alice', password: 'h1', secret: 's1' },
            { id: 2, name: 'Bob', password: 'h2', secret: 's2' },
        ]
        const results = applyHiddenFieldsToMany(rows, def)

        for (const r of results) {
            expect(Object.getOwnPropertyDescriptor(r, 'password')?.enumerable).toBe(false)
        }
    })

    it('returns array of same length', () => {
        const rows = [
            { id: 1, name: 'Alice', password: 'h1', secret: 's1' },
            { id: 2, name: 'Bob', password: 'h2', secret: 's2' },
        ]
        expect(applyHiddenFieldsToMany(rows, def)).toHaveLength(2)
    })
})

// ─── applyHashing ─────────────────────────────────────────────────────────────

describe('applyHashing', () => {
    it('hashes fields with hashFn', async () => {
        const customHash = vi.fn((v: string) => `hashed_${v}`)
        const defWithHash: ModelDef = {
            identifier: 'User',
            table: 'users',
            schema: {
                id: field.id().build(),
                password: field.varchar().hash(customHash).build(),
            },
        }

        const result = await applyHashing({ id: 1, password: 'secret' }, defWithHash)

        expect(customHash).toHaveBeenCalledWith('secret')
        expect(result.password).toBe('hashed_secret')
    })

    it('does not modify fields without hashFn', async () => {
        const result = await applyHashing({ id: 1, name: 'Alice' }, def)
        expect(result.name).toBe('Alice')
        expect(result.id).toBe(1)
    })

    it('skips null/undefined hash fields', async () => {
        const customHash = vi.fn((v: string) => `hashed_${v}`)
        const defWithHash: ModelDef = {
            identifier: 'User',
            table: 'users',
            schema: {
                id: field.id().build(),
                password: field.varchar().nullable().hash(customHash).build(),
            },
        }

        const result = await applyHashing({ password: null }, defWithHash)
        expect(customHash).not.toHaveBeenCalled()
        expect(result.password).toBeNull()
    })

    it('throws if hash field receives a non-string value', async () => {
        const defWithHash: ModelDef = {
            identifier: 'User',
            table: 'users',
            schema: {
                id: field.id().build(),
                password: field.varchar().hash().build(),
            },
        }

        await expect(
            applyHashing({ password: 12345 as unknown as string }, defWithHash)
        ).rejects.toThrow('non-string value')
    })

    it('returns a new object without mutating input', async () => {
        const input = { id: 1, name: 'Alice' }
        const result = await applyHashing(input, def)
        expect(result).not.toBe(input)
        expect(input.name).toBe('Alice')
    })

    it('hashes multiple fields', async () => {
        const hashA = vi.fn((v: string) => `a_${v}`)
        const hashB = vi.fn((v: string) => `b_${v}`)
        const multiDef: ModelDef = {
            identifier: 'Cred',
            table: 'creds',
            schema: {
                id: field.id().build(),
                pin: field.varchar().hash(hashA).build(),
                token: field.varchar().hash(hashB).build(),
            },
        }

        const result = await applyHashing({ pin: '1234', token: 'abc' }, multiDef)
        expect(result.pin).toBe('a_1234')
        expect(result.token).toBe('b_abc')
    })
})
