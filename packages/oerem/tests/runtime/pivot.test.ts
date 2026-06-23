import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Knex } from 'knex'
import { OeremModel } from '../../src/runtime/model.js'
import { createTestKnex, setupSchema, userDef, roleDef } from './helpers.js'
import { hasMany } from '../../src/index.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
    id: number; name: string; email: string | null
    password: string; is_active: boolean
    roles?: Role[]
}
type Role = { id: number; name: string }
type UserR = { roles: Role[] }

// ─── Setup ────────────────────────────────────────────────────────────────────

let knex: Knex
let User: OeremModel<User, UserR>
let Role: OeremModel<Role>
let userId: number
let adminId: number
let editorId: number

beforeEach(async () => {
    knex = createTestKnex()
    await setupSchema(knex)
    User = new OeremModel<User, UserR>(knex, userDef)
    Role = new OeremModel<Role>(knex, roleDef)

    const user = await User.insert({ name: 'Alice', email: null, password: 'x', is_active: true })
    userId = user.id

    const admin = await Role.insert({ name: 'Admin' })
    const editor = await Role.insert({ name: 'Editor' })
    adminId = admin.id
    editorId = editor.id
})

afterEach(async () => {
    await knex.destroy()
})

// ─── attach ───────────────────────────────────────────────────────────────────

describe('through().attach()', () => {
    it('attaches a single id', async () => {
        await User.through('roles', userId).attach(adminId)
        expect(await User.through('roles', userId).has(adminId)).toBe(true)
    })

    it('attaches multiple ids', async () => {
        await User.through('roles', userId).attach([adminId, editorId])
        expect(await User.through('roles', userId).count()).toBe(2)
    })

    it('attaches with extra columns', async () => {
        await User.through('roles', userId).attach({ id: adminId, assigned_at: '2024-01-01' })
        const pivot = await knex('user_roles').where({ user_id: userId, role_id: adminId }).first()
        expect(pivot.assigned_at).toBe('2024-01-01')
    })

    it('attaches array with mixed extra columns', async () => {
        await User.through('roles', userId).attach([
            { id: adminId, assigned_at: '2024-01-01' },
            editorId,
        ])
        expect(await User.through('roles', userId).count()).toBe(2)
    })
})

// ─── detach ───────────────────────────────────────────────────────────────────

describe('through().detach()', () => {
    beforeEach(async () => {
        await User.through('roles', userId).attach([adminId, editorId])
    })

    it('detaches a single id', async () => {
        await User.through('roles', userId).detach(adminId)
        expect(await User.through('roles', userId).has(adminId)).toBe(false)
        expect(await User.through('roles', userId).has(editorId)).toBe(true)
    })

    it('detaches multiple ids', async () => {
        await User.through('roles', userId).detach([adminId, editorId])
        expect(await User.through('roles', userId).count()).toBe(0)
    })

    it('detachAll removes all pivot rows', async () => {
        await User.through('roles', userId).detachAll()
        expect(await User.through('roles', userId).count()).toBe(0)
    })

    it('detach returns count of removed rows', async () => {
        const count = await User.through('roles', userId).detach(adminId)
        expect(count).toBe(1)
    })
})

// ─── has ──────────────────────────────────────────────────────────────────────

describe('through().has()', () => {
    it('returns true if relation exists', async () => {
        await User.through('roles', userId).attach(adminId)
        expect(await User.through('roles', userId).has(adminId)).toBe(true)
    })

    it('returns false if relation does not exist', async () => {
        expect(await User.through('roles', userId).has(adminId)).toBe(false)
    })
})

// ─── count ────────────────────────────────────────────────────────────────────

describe('through().count()', () => {
    it('returns 0 when no relations', async () => {
        expect(await User.through('roles', userId).count()).toBe(0)
    })

    it('returns correct count after attach', async () => {
        await User.through('roles', userId).attach([adminId, editorId])
        expect(await User.through('roles', userId).count()).toBe(2)
    })
})

// ─── toggle ───────────────────────────────────────────────────────────────────

describe('through().toggle()', () => {
    it('attaches if not present, returns "attached"', async () => {
        const result = await User.through('roles', userId).toggle(adminId)
        expect(result).toBe('attached')
        expect(await User.through('roles', userId).has(adminId)).toBe(true)
    })

    it('detaches if present, returns "detached"', async () => {
        await User.through('roles', userId).attach(adminId)
        const result = await User.through('roles', userId).toggle(adminId)
        expect(result).toBe('detached')
        expect(await User.through('roles', userId).has(adminId)).toBe(false)
    })

    it('toggle with extra columns on attach', async () => {
        await User.through('roles', userId).toggle(adminId, { assigned_at: '2024-01-01' })
        const pivot = await knex('user_roles').where({ user_id: userId, role_id: adminId }).first()
        expect(pivot.assigned_at).toBe('2024-01-01')
    })
})

// ─── sync ─────────────────────────────────────────────────────────────────────

describe('through().sync()', () => {
    beforeEach(async () => {
        await User.through('roles', userId).attach(adminId)
    })

    it('attaches new ids', async () => {
        const result = await User.through('roles', userId).sync([adminId, editorId])
        expect(result.attached).toContain(editorId)
        expect(result.detached).toHaveLength(0)
    })

    it('detaches ids not in list', async () => {
        const result = await User.through('roles', userId).sync([editorId])
        expect(result.detached).toContain(adminId)
        expect(result.attached).toContain(editorId)
    })

    it('does not re-attach existing ids', async () => {
        const result = await User.through('roles', userId).sync([adminId])
        expect(result.attached).toHaveLength(0)
        expect(result.detached).toHaveLength(0)
    })

    it('sync to empty detaches all', async () => {
        const result = await User.through('roles', userId).sync([])
        expect(result.detached).toContain(adminId)
        expect(await User.through('roles', userId).count()).toBe(0)
    })

    it('updates extra columns when update: true', async () => {
        const result = await User.through('roles', userId).sync(
            [{ id: adminId, assigned_at: '2024-06-01' }],
            { update: true }
        )
        expect(result.updated).toContain(adminId)
        const pivot = await knex('user_roles').where({ user_id: userId, role_id: adminId }).first()
        expect(pivot.assigned_at).toBe('2024-06-01')
    })

    it('does not update extra columns when update: false (default)', async () => {
        await knex('user_roles')
            .where({ user_id: userId, role_id: adminId })
            .update({ assigned_at: 'original' })
        await User.through('roles', userId).sync(
            [{ id: adminId, assigned_at: 'changed' }],
            { update: false }
        )
        const pivot = await knex('user_roles').where({ user_id: userId, role_id: adminId }).first()
        expect(pivot.assigned_at).toBe('original')
    })
})

// ─── query ────────────────────────────────────────────────────────────────────

describe('through().query()', () => {
    beforeEach(async () => {
        await User.through('roles', userId).attach([adminId, editorId])
    })

    it('returns query builder scoped to related rows', async () => {
        const roles = await User.through<Role>('roles', userId).query().get()
        expect(roles).toHaveLength(2)
    })

    it('supports further chaining', async () => {
        const roles = await User.through<Role>('roles', userId)
            .query()
            .where('name', 'Admin')
            .get()
        expect(roles).toHaveLength(1)
        expect(roles[0].name).toBe('Admin')
    })

    it('supports orderBy', async () => {
        const roles = await User.through<Role>('roles', userId)
            .query()
            .orderBy('name', 'asc')
            .get()
        expect(roles[0].name).toBe('Admin')
        expect(roles[1].name).toBe('Editor')
    })
})

// ─── Error handling ───────────────────────────────────────────────────────────

describe('through() error handling', () => {
    it('throws if relation does not exist', () => {
        expect(() => User.through('nonexistent' as keyof UserR, userId))
            .toThrow('Relation "nonexistent" not found')
    })

    it('throws if relation is not belongsToMany', () => {
        // postDef has hasMany relation
        const PostModel = new OeremModel(knex, {
            identifier: 'Post',
            table: 'posts',
            schema: {},
            relations: {
                comments: hasMany(() => ({ identifier: 'Comment', table: 'comments', schema: {} }), 'post_id'),
            },
        })
        expect(() => (PostModel as any).through('comments', 1))
            .toThrow('through() can only be used with belongsToMany')
    })
})