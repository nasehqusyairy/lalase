import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Knex } from 'knex'
import { OeremModel } from '../../src/runtime/model.js'
import { OeremPool } from '../../src/runtime/pool.js'
import { createTestKnex, setupSchema, userDef, postDef, profileDef, roleDef } from './helpers.js'

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors what oerem CLI would generate:
// TUser = schema fields & RUser (relations already included via intersection)

type Post = { id: number; title: string; user_id: number; user?: User | null }
type Profile = { id: number; bio: string | null; user_id: number }
type Role = { id: number; name: string }

type User = {
    id: number
    name: string
    email: string | null
    password: string
    is_active: boolean
    // relations — already part of T as generated
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

    // Seed
    await User.insert({ name: 'Alice', email: 'alice@example.com', password: 'x', is_active: true })
    await User.insert({ name: 'Bob', email: 'bob@example.com', password: 'x', is_active: true })
    await User.insert({ name: 'Charlie', email: null, password: 'x', is_active: false })
})

afterEach(async () => {
    await knex.destroy()
})

// ─── query().get() ────────────────────────────────────────────────────────────

describe('query().get()', () => {
    it('returns all rows', async () => {
        const users = await User.query().get()
        expect(users).toHaveLength(3)
    })

    it('applies hidden fields', async () => {
        const users = await User.query().get()
        for (const u of users) {
            expect(Object.getOwnPropertyDescriptor(u, 'password')?.enumerable).toBe(false)
        }
    })
})

// ─── query().first() ──────────────────────────────────────────────────────────

describe('query().first()', () => {
    it('returns first matching row', async () => {
        const user = await User.query().where('name', 'Alice').first()
        expect(user?.name).toBe('Alice')
    })

    it('returns null if not found', async () => {
        expect(await User.query().where('name', 'Nobody').first()).toBeNull()
    })

    it('applies hidden fields', async () => {
        const user = await User.query().first()
        expect(Object.getOwnPropertyDescriptor(user!, 'password')?.enumerable).toBe(false)
    })
})

// ─── where overloads ──────────────────────────────────────────────────────────

describe('where', () => {
    it('object literal — exact match', async () => {
        const users = await User.query().where({ name: 'Alice' }).get()
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe('Alice')
    })

    it('object literal — multiple conditions (AND)', async () => {
        const users = await User.query().where({ name: 'Alice', is_active: true }).get()
        expect(users).toHaveLength(1)
    })

    it('column + value', async () => {
        const users = await User.query().where('name', 'Bob').get()
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe('Bob')
    })

    it('column + operator + value', async () => {
        const users = await User.query().where('id', '>', 1).get()
        expect(users.length).toBeGreaterThanOrEqual(2)
    })

    it('chained where (AND)', async () => {
        const users = await User.query().where('name', 'Alice').where('is_active', true).get()
        expect(users).toHaveLength(1)
    })
})

// ─── orWhere ─────────────────────────────────────────────────────────────────

describe('orWhere', () => {
    it('object literal orWhere', async () => {
        const users = await User.query().where({ name: 'Alice' }).orWhere({ name: 'Bob' }).get()
        expect(users).toHaveLength(2)
    })

    it('column + value orWhere', async () => {
        const users = await User.query().where('name', 'Alice').orWhere('name', 'Charlie').get()
        expect(users).toHaveLength(2)
    })
})

// ─── whereNull / whereNotNull ─────────────────────────────────────────────────

describe('whereNull / whereNotNull', () => {
    it('whereNull finds rows with null column', async () => {
        const users = await User.query().whereNull('email').get()
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe('Charlie')
    })

    it('whereNotNull excludes null rows', async () => {
        expect(await User.query().whereNotNull('email').get()).toHaveLength(2)
    })
})

// ─── whereIn / whereNotIn ─────────────────────────────────────────────────────

describe('whereIn / whereNotIn', () => {
    it('whereIn filters by list', async () => {
        const users = await User.query().whereIn('name', ['Alice', 'Bob']).get()
        expect(users).toHaveLength(2)
    })

    it('whereNotIn excludes list', async () => {
        const users = await User.query().whereNotIn('name', ['Alice']).get()
        expect(users).toHaveLength(2)
        expect(users.map(u => u.name)).not.toContain('Alice')
    })
})

// ─── whereBetween ─────────────────────────────────────────────────────────────

describe('whereBetween / whereNotBetween', () => {
    it('whereBetween filters by range', async () => {
        expect(await User.query().whereBetween('id', [1, 2]).get()).toHaveLength(2)
    })

    it('whereNotBetween excludes range', async () => {
        expect(await User.query().whereNotBetween('id', [1, 2]).get()).toHaveLength(1)
    })
})

// ─── orderBy / limit / offset ─────────────────────────────────────────────────

describe('orderBy / limit / offset', () => {
    it('orderBy asc', async () => {
        const users = await User.query().orderBy('name', 'asc').get()
        expect(users[0].name).toBe('Alice')
        expect(users[2].name).toBe('Charlie')
    })

    it('orderBy desc', async () => {
        expect((await User.query().orderBy('name', 'desc').get())[0].name).toBe('Charlie')
    })

    it('limit', async () => {
        expect(await User.query().limit(2).get()).toHaveLength(2)
    })

    it('offset', async () => {
        const users = await User.query().orderBy('name', 'asc').offset(1).get()
        expect(users[0].name).toBe('Bob')
    })

    it('limit + offset', async () => {
        const users = await User.query().orderBy('name', 'asc').limit(1).offset(1).get()
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe('Bob')
    })
})

// ─── count ────────────────────────────────────────────────────────────────────

describe('count', () => {
    it('counts all rows', async () => {
        expect(await User.query().count()).toBe(3)
    })

    it('counts filtered rows', async () => {
        expect(await User.query().where('is_active', true).count()).toBe(2)
    })
})

// ─── paginate ─────────────────────────────────────────────────────────────────

describe('paginate', () => {
    it('returns correct structure', async () => {
        const result = await User.query().paginate(1, 2)
        expect(result.data).toHaveLength(2)
        expect(result.total).toBe(3)
        expect(result.page).toBe(1)
        expect(result.perPage).toBe(2)
        expect(result.lastPage).toBe(2)
    })

    it('page 2 returns remaining rows', async () => {
        expect((await User.query().paginate(2, 2)).data).toHaveLength(1)
    })

    it('combined with where', async () => {
        const result = await User.query().where('is_active', true).paginate(1, 10)
        expect(result.total).toBe(2)
    })

    it('applies hidden fields on paginated data', async () => {
        const result = await User.query().paginate(1, 10)
        for (const u of result.data) {
            expect(Object.getOwnPropertyDescriptor(u, 'password')?.enumerable).toBe(false)
        }
    })
})

// ─── update ───────────────────────────────────────────────────────────────────

describe('query().update()', () => {
    it('updates matching rows', async () => {
        const count = await User.query().where('name', 'Alice').update({ name: 'Alicia' })
        expect(count).toBe(1)
        expect(await User.query().where('name', 'Alicia').first()).not.toBeNull()
    })

    it('hashes password on update', async () => {
        await User.query().where('name', 'Alice').update({ password: 'newpass' })
        const user = await User.query().where('name', 'Alice').first()
        expect(user!.password.startsWith('$2b$')).toBe(true)
    })

    it('updates multiple rows', async () => {
        expect(await User.query().where('is_active', true).update({ is_active: false })).toBe(2)
    })
})

// ─── delete ───────────────────────────────────────────────────────────────────

describe('query().delete()', () => {
    it('deletes matching rows', async () => {
        expect(await User.query().where('name', 'Charlie').delete()).toBe(1)
        expect(await User.query().count()).toBe(2)
    })

    it('deletes multiple rows', async () => {
        expect(await User.query().where('is_active', true).delete()).toBe(2)
    })
})

// ─── with (eager loading) ─────────────────────────────────────────────────────

describe('query().with()', () => {
    let userId: number

    beforeEach(async () => {
        const user = await User.query().where('name', 'Alice').first()
        userId = user!.id
        await Post.insert({ title: 'Post 1', user_id: userId })
        await Post.insert({ title: 'Post 2', user_id: userId })
        await Profile.insert({ bio: 'Hello', user_id: userId })
        const role = await Role.insert({ name: 'Admin' })
        await knex('user_roles').insert({ user_id: userId, role_id: role.id })
    })

    it('loads hasMany inline', async () => {
        const users = await User.query().where('name', 'Alice').with('posts').get()
        expect(users[0].posts).toHaveLength(2)
    })

    it('loads hasOne inline', async () => {
        const users = await User.query().where('name', 'Alice').with('profile').get()
        expect(users[0].profile?.bio).toBe('Hello')
    })

    it('loads belongsTo inline', async () => {
        const posts = await Post.query().where('user_id', userId).with('user').get()
        expect(posts[0].user?.name).toBe('Alice')
    })

    it('loads belongsToMany inline', async () => {
        const users = await User.query().where('name', 'Alice').with('roles').get()
        expect(users[0].roles).toHaveLength(1)
        expect(users[0].roles![0].name).toBe('Admin')
    })

    it('loads multiple relations', async () => {
        const users = await User.query().where('name', 'Alice').with('posts', 'profile').get()
        expect(users[0].posts).toHaveLength(2)
        expect(users[0].profile?.bio).toBe('Hello')
    })

    it('combined with where + orderBy + with', async () => {
        const users = await User.query()
            .where('is_active', true)
            .orderBy('name', 'asc')
            .with('posts')
            .get()
        expect(users[0].name).toBe('Alice')
        expect(users[0].posts).toHaveLength(2)
        expect(users[1].posts).toHaveLength(0)
    })

    it('throws on unknown relation', async () => {
        await expect(
            User.query().with('nonexistent' as keyof UserR).get()
        ).rejects.toThrow('Relation "nonexistent" not found')
    })
})

// ─── transaction via pool ─────────────────────────────────────────────────────

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

    afterEach(async () => { await pool.destroy() })

    it('query builder uses transaction', async () => {
        await pool.transaction(async () => {
            await PoolUser.insert({ name: 'Tx User', email: null, password: 'x', is_active: true })
        })
        expect(await PoolUser.query().where('name', 'Tx User').first()).not.toBeNull()
    })

    it('rolls back on error', async () => {
        await expect(
            pool.transaction(async () => {
                await PoolUser.insert({ name: 'Rb User', email: null, password: 'x', is_active: true })
                throw new Error('forced rollback')
            })
        ).rejects.toThrow('forced rollback')
        expect(await PoolUser.query().where('name', 'Rb User').first()).toBeNull()
    })
})