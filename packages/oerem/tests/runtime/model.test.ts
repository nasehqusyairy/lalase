import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Knex } from 'knex'
import { OeremModel } from '../../src/runtime/model.js'
import { OeremPool } from '../../src/runtime/pool.js'
import { createTestKnex, setupSchema, userDef, postDef, profileDef, roleDef } from './helpers.js'

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors generated types: T includes relations via intersection

type Post = { id: number; title: string; user_id: number; user?: User | null }
type Profile = { id: number; bio: string | null; user_id: number }
type Role = { id: number; name: string }

type User = {
    id: number
    name: string
    email: string | null
    password: string
    is_active: boolean
    posts?: Post[]
    profile?: Profile | null
    roles?: Role[]
}

type UserR = { posts: Post[]; profile: Profile | null; roles: Role[] }
type PostR = { user: User | null }

// ─── Setup ────────────────────────────────────────────────────────────────────

let knex: Knex
let User: OeremModel<User, UserR>
let Post: OeremModel<Post, PostR>
let Profile: OeremModel<Profile>
let Role: OeremModel<Role>

beforeEach(async () => {
    knex = createTestKnex()
    await setupSchema(knex)
    User = new OeremModel<User, UserR>(knex, userDef)
    Post = new OeremModel<Post, PostR>(knex, postDef)
    Profile = new OeremModel<Profile>(knex, profileDef)
    Role = new OeremModel<Role>(knex, roleDef)
})

afterEach(async () => {
    await knex.destroy()
})

// ─── insert ───────────────────────────────────────────────────────────────────

describe('insert', () => {
    it('inserts a row and returns it', async () => {
        const user = await User.insert({ name: 'Alice', email: 'alice@example.com', password: 'secret' })
        expect(user.id).toBeTypeOf('number')
        expect(user.name).toBe('Alice')
        expect(user.email).toBe('alice@example.com')
    })

    it('hashes the password field on insert', async () => {
        const user = await User.insert({ name: 'Alice', email: null, password: 'plaintext' })
        expect(user.password).not.toBe('plaintext')
        expect(user.password.startsWith('$2b$')).toBe(true)
    })

    it('makes password non-enumerable (hidden) on returned row', async () => {
        const user = await User.insert({ name: 'Alice', email: null, password: 'secret' })
        expect(Object.getOwnPropertyDescriptor(user, 'password')?.enumerable).toBe(false)
    })

    it('password is still accessible on returned row', async () => {
        const user = await User.insert({ name: 'Alice', email: null, password: 'secret' })
        expect(user.password).toBeDefined()
        expect(typeof user.password).toBe('string')
    })

    it('password is excluded from JSON.stringify on returned row', async () => {
        const user = await User.insert({ name: 'Alice', email: null, password: 'secret' })
        const json = JSON.parse(JSON.stringify(user))
        expect(json).not.toHaveProperty('password')
    })
})

// ─── findById ─────────────────────────────────────────────────────────────────

describe('findById', () => {
    it('returns the row by id', async () => {
        const created = await User.insert({ name: 'Bob', email: null, password: 'x' })
        const found = await User.findById(created.id)
        expect(found?.name).toBe('Bob')
    })

    it('returns null for non-existent id', async () => {
        expect(await User.findById(9999)).toBeNull()
    })

    it('applies hidden fields on found row', async () => {
        const created = await User.insert({ name: 'Bob', email: null, password: 'x' })
        const found = await User.findById(created.id)
        expect(Object.getOwnPropertyDescriptor(found!, 'password')?.enumerable).toBe(false)
    })
})

// ─── findOne ──────────────────────────────────────────────────────────────────

describe('findOne', () => {
    it('finds by where clause', async () => {
        await User.insert({ name: 'Charlie', email: 'charlie@example.com', password: 'x' })
        const found = await User.findOne({ email: 'charlie@example.com' })
        expect(found?.name).toBe('Charlie')
    })

    it('returns null if not found', async () => {
        expect(await User.findOne({ email: 'nobody@example.com' })).toBeNull()
    })
})

// ─── findMany ─────────────────────────────────────────────────────────────────

describe('findMany', () => {
    beforeEach(async () => {
        await User.insert({ name: 'Alice', email: null, password: 'x' })
        await User.insert({ name: 'Bob', email: null, password: 'x' })
        await User.insert({ name: 'Charlie', email: null, password: 'x' })
    })

    it('returns all rows without filter', async () => {
        expect(await User.findMany()).toHaveLength(3)
    })

    it('filters by where', async () => {
        const users = await User.findMany({ name: 'Bob' })
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe('Bob')
    })

    it('applies orderBy desc', async () => {
        const users = await User.findMany(undefined, { orderBy: { column: 'name', direction: 'desc' } })
        expect(users[0].name).toBe('Charlie')
    })

    it('applies limit', async () => {
        expect(await User.findMany(undefined, { limit: 2 })).toHaveLength(2)
    })

    it('applies offset', async () => {
        const users = await User.findMany(undefined, {
            orderBy: { column: 'name', direction: 'asc' },
            offset: 1,
        })
        expect(users[0].name).toBe('Bob')
    })

    it('applies hidden fields to all rows', async () => {
        const users = await User.findMany()
        for (const u of users) {
            expect(Object.getOwnPropertyDescriptor(u, 'password')?.enumerable).toBe(false)
        }
    })
})

// ─── updateById ───────────────────────────────────────────────────────────────

describe('updateById', () => {
    it('updates a row and returns it', async () => {
        const user = await User.insert({ name: 'Dave', email: null, password: 'x' })
        const updated = await User.updateById(user.id, { name: 'David' })
        expect(updated?.name).toBe('David')
    })

    it('returns null for non-existent id', async () => {
        expect(await User.updateById(9999, { name: 'Ghost' })).toBeNull()
    })

    it('hashes password on update', async () => {
        const user = await User.insert({ name: 'Eve', email: null, password: 'old' })
        const updated = await User.updateById(user.id, { password: 'newpass' })
        expect(updated!.password.startsWith('$2b$')).toBe(true)
    })
})

describe('update', () => {
    it('updates multiple matching rows', async () => {
        await User.insert({ name: 'A', email: null, password: 'x' })
        await User.insert({ name: 'A', email: null, password: 'x' })
        expect(await User.update({ name: 'A' }, { name: 'Z' })).toBe(2)
    })
})

// ─── delete ───────────────────────────────────────────────────────────────────

describe('deleteById', () => {
    it('deletes by id', async () => {
        const user = await User.insert({ name: 'Frank', email: null, password: 'x' })
        expect(await User.deleteById(user.id)).toBe(1)
        expect(await User.findById(user.id)).toBeNull()
    })
})

describe('delete', () => {
    it('deletes matching rows', async () => {
        await User.insert({ name: 'X', email: null, password: 'x' })
        await User.insert({ name: 'X', email: null, password: 'x' })
        expect(await User.delete({ name: 'X' })).toBe(2)
    })
})

// ─── paginate ─────────────────────────────────────────────────────────────────

describe('paginate', () => {
    beforeEach(async () => {
        for (let i = 1; i <= 10; i++) {
            await User.insert({ name: `User${i}`, email: null, password: 'x' })
        }
    })

    it('returns correct page data', async () => {
        const result = await User.paginate(1, 3)
        expect(result.data).toHaveLength(3)
        expect(result.page).toBe(1)
        expect(result.perPage).toBe(3)
    })

    it('returns correct total and lastPage', async () => {
        const result = await User.paginate(1, 3)
        expect(result.total).toBe(10)
        expect(result.lastPage).toBe(4)
    })

    it('page 2 returns different rows than page 1', async () => {
        const p1 = await User.paginate(1, 4)
        const p2 = await User.paginate(2, 4)
        expect(p1.data.map(u => u.id)).not.toEqual(p2.data.map(u => u.id))
    })

    it('filters with where', async () => {
        await User.insert({ name: 'Special', email: 'sp@x.com', password: 'x' })
        const result = await User.paginate(1, 10, { name: 'Special' })
        expect(result.total).toBe(1)
    })
})

// ─── with (eager loading) ─────────────────────────────────────────────────────

describe('with', () => {
    let userId: number

    beforeEach(async () => {
        const user = await User.insert({ name: 'Grace', email: null, password: 'x' })
        userId = user.id
        await Post.insert({ title: 'Post 1', user_id: userId })
        await Post.insert({ title: 'Post 2', user_id: userId })
        await Profile.insert({ bio: 'Hello', user_id: userId })
        const role = await Role.insert({ name: 'Admin' })
        await knex('user_roles').insert({ user_id: userId, role_id: role.id })
    })

    it('loads hasMany relation', async () => {
        const users = await User.findMany({ name: 'Grace' })
        const [u] = await User.with(users, 'posts')
        expect(u.posts).toHaveLength(2)
    })

    it('loads hasOne relation', async () => {
        const users = await User.findMany({ name: 'Grace' })
        const [u] = await User.with(users, 'profile')
        expect(u.profile?.bio).toBe('Hello')
    })

    it('loads belongsTo relation', async () => {
        const posts = await Post.findMany({ user_id: userId })
        const [p] = await Post.with(posts, 'user')
        expect(p.user?.name).toBe('Grace')
    })

    it('loads belongsToMany relation', async () => {
        const users = await User.findMany({ name: 'Grace' })
        const [u] = await User.with(users, 'roles')
        expect(u.roles).toHaveLength(1)
        expect(u.roles![0].name).toBe('Admin')
    })

    it('returns empty array for hasMany with no results', async () => {
        const other = await User.insert({ name: 'NoPost', email: null, password: 'x' })
        const users = await User.findMany({ id: other.id })
        const [u] = await User.with(users, 'posts')
        expect(u.posts).toEqual([])
    })

    it('returns input unchanged when rows is empty', async () => {
        expect(await User.with([], 'posts')).toEqual([])
    })

    it('throws on unknown relation', async () => {
        const users = await User.findMany()
        await expect(User.with(users, 'nonexistent' as keyof UserR)).rejects.toThrow(
            'Relation "nonexistent" not found'
        )
    })
})

// ─── transaction ──────────────────────────────────────────────────────────────

describe('transaction via OeremPool', () => {
    let pool: OeremPool
    let PoolUser: OeremModel<User, UserR>

    beforeEach(async () => {
        pool = new OeremPool({
            client: 'better-sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true,
        })
        await setupSchema(pool.getKnex())
        PoolUser = pool.createModel<User, UserR>(userDef)
    })

    afterEach(async () => {
        await pool.destroy()
    })

    it('commits on success', async () => {
        await pool.transaction(async () => {
            await PoolUser.insert({ name: 'Tx User', email: null, password: 'x' })
        })
        expect(await PoolUser.findOne({ name: 'Tx User' })).not.toBeNull()
    })

    it('rolls back on error', async () => {
        await expect(
            pool.transaction(async () => {
                await PoolUser.insert({ name: 'Rollback User', email: null, password: 'x' })
                throw new Error('forced rollback')
            })
        ).rejects.toThrow('forced rollback')
        expect(await PoolUser.findOne({ name: 'Rollback User' })).toBeNull()
    })
})