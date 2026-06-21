import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { generateTypeFile, generateTypes } from '../../src/cli/generators/types.generator.js'
import { field } from '../../src/schema/field.js'
import { hasMany, belongsTo } from '../../src/schema/relations.js'
import type { DiscoveredModel } from '../../src/cli/scanner.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const userModel: DiscoveredModel = {
    filePath: '/project/models/user.model.ts',
    fileName: 'user.model.ts',
    modelName: 'user.model',
    def: {
        identifier: 'User',
        table: 'users',
        schema: {
            id: field.integer().primary().build(),
            name: field.varchar(100).build(),
            email: field.varchar(255).nullable().unique().build(),
            password: field.varchar(255).hash().hidden().build(),
            age: field.integer().nullable().build(),
            is_active: field.boolean().default(true).build(),
            created_at: field.timestamp().nullable().build(),
        },
        relations: {
            posts: hasMany(() => postModel.def, 'user_id'),
        },
    },
}

const postModel: DiscoveredModel = {
    filePath: '/project/models/post.model.ts',
    fileName: 'post.model.ts',
    modelName: 'post.model',
    def: {
        identifier: 'Post',
        table: 'posts',
        schema: {
            id: field.integer().primary().build(),
            title: field.varchar(255).build(),
            user_id: field.integer().foreign().constrained('users').cascadeOn('delete').build(),
        },
        relations: {
            user: belongsTo(() => userModel.def, 'user_id'),
        },
    },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateTypeFile', () => {
    it('generates TUser type with correct fields', () => {
        const content = generateTypeFile(userModel, [userModel, postModel], '/output')
        expect(content).toContain('export type TUser = {')
        expect(content).toContain('id: number')
        expect(content).toContain('name: string')
        expect(content).toContain('email: string | null')
        expect(content).toContain('age: number | null')
        expect(content).toContain('is_active: boolean')
        expect(content).toContain('created_at: Date | null')
    })

    it('includes password field (hidden does not exclude from type)', () => {
        const content = generateTypeFile(userModel, [userModel, postModel], '/output')
        expect(content).toContain('password: string')
    })

    it('generates RUser type with relation', () => {
        const content = generateTypeFile(userModel, [userModel, postModel], '/output')
        expect(content).toContain('export type RUser = {')
        expect(content).toContain('posts?: TPost[]')
    })

    it('intersects TUser with RUser', () => {
        const content = generateTypeFile(userModel, [userModel, postModel], '/output')
        expect(content).toContain('} & RUser')
    })

    it('generates import for related types', () => {
        const content = generateTypeFile(userModel, [userModel, postModel], '/output')
        expect(content).toContain("import type { TPost } from './post.types.js'")
    })

    it('generates TPost with foreign key field', () => {
        const content = generateTypeFile(postModel, [userModel, postModel], '/output')
        expect(content).toContain('user_id: number')
    })

    it('generates RPost with belongsTo as nullable', () => {
        const content = generateTypeFile(postModel, [userModel, postModel], '/output')
        expect(content).toContain('user?: TUser | null')
    })

    it('generates empty R type when no relations', () => {
        const simpleModel: DiscoveredModel = {
            filePath: '/project/models/tag.model.ts',
            fileName: 'tag.model.ts',
            modelName: 'tag.model',
            def: {
                identifier: 'Tag',
                table: 'tags',
                schema: {
                    id: field.integer().primary().build(),
                    name: field.varchar(100).build(),
                },
            },
        }

        const content = generateTypeFile(simpleModel, [simpleModel], '/output')
        expect(content).toContain('export type RTag = Record<string, never>')
        expect(content).not.toContain('} & RTag')
    })

    it('generates enum field as union type', () => {
        const model: DiscoveredModel = {
            filePath: '/project/models/role.model.ts',
            fileName: 'role.model.ts',
            modelName: 'role.model',
            def: {
                identifier: 'Role',
                table: 'roles',
                schema: {
                    id: field.integer().primary().build(),
                    type: field.enum('admin', 'user', 'guest').build(),
                },
            },
        }

        const content = generateTypeFile(model, [model], '/output')
        expect(content).toContain("type: 'admin' | 'user' | 'guest'")
    })

    it('adds generated-by comment', () => {
        const content = generateTypeFile(userModel, [userModel, postModel], '/output')
        expect(content).toContain('Generated by oerem')
    })
})

describe('generateTypes', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = resolve(tmpdir(), `oerem-types-test-${Date.now()}`)
        mkdirSync(tmpDir, { recursive: true })
    })

    afterEach(() => {
        if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
    })

    it('creates output directory if it does not exist', () => {
        const outputDir = resolve(tmpDir, 'types')
        generateTypes([userModel, postModel], outputDir)
        expect(existsSync(outputDir)).toBe(true)
    })

    it('generates a type file per model', () => {
        generateTypes([userModel, postModel], tmpDir)
        expect(existsSync(resolve(tmpDir, 'user.types.ts'))).toBe(true)
        expect(existsSync(resolve(tmpDir, 'post.types.ts'))).toBe(true)
    })

    it('generates barrel index.ts', () => {
        generateTypes([userModel, postModel], tmpDir)
        const index = readFileSync(resolve(tmpDir, 'index.ts'), 'utf-8')
        expect(index).toContain("export type { TUser, RUser } from './user.types.js'")
        expect(index).toContain("export type { TPost, RPost } from './post.types.js'")
    })
})