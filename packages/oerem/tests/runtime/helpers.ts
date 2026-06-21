import Knex from 'knex'
import type { Knex as KnexType } from 'knex'
import { field } from '../../src/schema/field.js'
import { hasMany, belongsTo, hasOne, belongsToMany } from '../../src/schema/relations.js'
import type { ModelDef } from '../../src/schema/types.js'

// ─── SQLite in-memory knex instance ──────────────────────────────────────────

export function createTestKnex(): KnexType {
    return Knex({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
    })
}

// ─── Model definitions ────────────────────────────────────────────────────────

export const userDef: ModelDef = {
    identifier: 'User',
    table: 'users',
    schema: {
        id: field.integer().primary().build(),
        name: field.varchar(100).build(),
        email: field.varchar(255).nullable().unique().build(),
        password: field.varchar(255).hash().hidden().build(),
        is_active: field.boolean().default(true).build(),
    },
    relations: {
        posts: hasMany(() => postDef, 'user_id'),
        profile: hasOne(() => profileDef, 'user_id'),
    },
}

export const postDef: ModelDef = {
    identifier: 'Post',
    table: 'posts',
    schema: {
        id: field.integer().primary().build(),
        title: field.varchar(255).build(),
        user_id: field.integer().foreign().constrained('users').cascadeOn('delete').build(),
    },
    relations: {
        user: belongsTo(() => userDef, 'user_id'),
    },
}

export const profileDef: ModelDef = {
    identifier: 'Profile',
    table: 'profiles',
    schema: {
        id: field.integer().primary().build(),
        bio: field.text().nullable().build(),
        user_id: field.integer().build(),
    },
}

export const roleDef: ModelDef = {
    identifier: 'Role',
    table: 'roles',
    schema: {
        id: field.integer().primary().build(),
        name: field.varchar(100).build(),
    },
}

    // Add belongsToMany to userDef after all defs are declared
    ; (userDef.relations as Record<string, unknown>).roles = belongsToMany(
        () => roleDef,
        'user_roles',
        'user_id',
        'role_id',
    )

// ─── Schema setup ─────────────────────────────────────────────────────────────

export async function setupSchema(knex: KnexType): Promise<void> {
    await knex.schema.createTable('users', (t) => {
        t.increments('id')
        t.string('name', 100).notNullable()
        t.string('email', 255).nullable().unique()
        t.string('password', 255).notNullable()
        t.boolean('is_active').notNullable().defaultTo(true)
    })

    await knex.schema.createTable('posts', (t) => {
        t.increments('id')
        t.string('title', 255).notNullable()
        t.integer('user_id').notNullable().references('id').inTable('users')
    })

    await knex.schema.createTable('profiles', (t) => {
        t.increments('id')
        t.text('bio').nullable()
        t.integer('user_id').notNullable()
    })

    await knex.schema.createTable('roles', (t) => {
        t.increments('id')
        t.string('name', 100).notNullable()
    })

    await knex.schema.createTable('user_roles', (t) => {
        t.integer('user_id').notNullable()
        t.integer('role_id').notNullable()
    })
}