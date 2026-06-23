import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { field } from '../../src/schema/field.js'
import { hasMany } from '../../src/schema/relations.js'
import type { ModelDef } from '../../src/schema/types.js'
import {
    createSnapshot,
    serializeModel,
    diffSchemas,
    type SchemaSnapshot,
} from '../../src/cli/generators/snapshot.js'
import {
    saveSnapshot,
    loadSnapshot,
    generateDiffMigration,
    snapshotPath,
} from '../../src/cli/generators/diff.generator.js'
import type { DiscoveredModel } from '../../src/cli/scanner.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
    const dir = resolve(tmpdir(), `oerem-diff-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
    return dir
}

function toDiscovered(def: ModelDef): DiscoveredModel {
    return {
        filePath: `/project/models/${def.identifier.toLowerCase()}.model.ts`,
        fileName: `${def.identifier.toLowerCase()}.model.ts`,
        modelName: `${def.identifier.toLowerCase()}.model`,
        def,
    }
}

// ─── Model Fixtures ───────────────────────────────────────────────────────────

const userDef: ModelDef = {
    identifier: 'User',
    table: 'users',
    schema: {
        id: field.id().build(),
        name: field.varchar(100).build(),
        email: field.varchar(255).nullable().unique().build(),
        password: field.varchar(255).hash().hidden().build(),
    },
}

const postDef: ModelDef = {
    identifier: 'Post',
    table: 'posts',
    schema: {
        id: field.id().build(),
        title: field.varchar(255).build(),
        user_id: field.foreignId().constrained('users').cascadeOn('delete').build(),
    },
    relations: {
        user: hasMany(() => userDef, 'user_id'),
    },
}

// ─── serializeModel ───────────────────────────────────────────────────────────

describe('serializeModel', () => {
    it('serializes all field metadata', () => {
        const snap = serializeModel(userDef)
        expect(snap.identifier).toBe('User')
        expect(snap.table).toBe('users')
        expect(snap.schema.id.isPrimary).toBe(true)
        expect(snap.schema.email.isNullable).toBe(true)
        expect(snap.schema.email.isUnique).toBe(true)
        expect(snap.schema.password.isHidden).toBe(true)
    })

    it('strips hashFn (not serializable)', () => {
        const snap = serializeModel(userDef)
        expect((snap.schema.password as any).hashFn).toBeUndefined()
    })

    it('serializes foreign key metadata', () => {
        const snap = serializeModel(postDef)
        expect(snap.schema.user_id.foreign?.referencesTable).toBe('users')
        expect(snap.schema.user_id.foreign?.referencesColumn).toBe('id')
        expect(snap.schema.user_id.foreign?.cascadeOn).toContain('delete')
    })

    it('relations are not included in snapshot (DDL only)', () => {
        const snap = serializeModel(postDef)
        expect((snap as any).relations).toBeUndefined()
    })
})

// ─── createSnapshot ───��───────────────────────────────────────────────────────

describe('createSnapshot', () => {
    it('creates snapshot with version and timestamp', () => {
        const snap = createSnapshot([userDef, postDef])
        expect(snap.version).toBe(1)
        expect(typeof snap.createdAt).toBe('string')
        expect(new Date(snap.createdAt).getTime()).not.toBeNaN()
    })

    it('includes all models', () => {
        const snap = createSnapshot([userDef, postDef])
        expect(snap.models).toHaveLength(2)
        expect(snap.models.map(m => m.identifier)).toContain('User')
        expect(snap.models.map(m => m.identifier)).toContain('Post')
    })
})

// ─── saveSnapshot / loadSnapshot ──────────────────────────────────────────────

describe('saveSnapshot / loadSnapshot', () => {
    let tmpDir: string

    beforeEach(() => { tmpDir = makeTmpDir() })
    afterEach(() => { if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true }) })

    it('saves snapshot to .oerem-snapshot.json', () => {
        saveSnapshot([userDef], tmpDir)
        expect(existsSync(snapshotPath(tmpDir))).toBe(true)
    })

    it('loads the saved snapshot back', () => {
        saveSnapshot([userDef], tmpDir)
        const loaded = loadSnapshot(tmpDir)
        expect(loaded).not.toBeNull()
        expect(loaded!.models[0].identifier).toBe('User')
    })

    it('returns null if no snapshot exists', () => {
        expect(loadSnapshot(tmpDir)).toBeNull()
    })

    it('snapshot file is valid JSON', () => {
        saveSnapshot([userDef], tmpDir)
        const raw = readFileSync(snapshotPath(tmpDir), 'utf-8')
        expect(() => JSON.parse(raw)).not.toThrow()
    })
})

// ─── diffSchemas ──────────────────────────────────────────────────────────────

describe('diffSchemas', () => {
    it('detects no changes when schemas are identical', () => {
        const snap = createSnapshot([userDef])
        const diff = diffSchemas(snap, snap)
        expect(diff.hasChanges).toBe(false)
        expect(diff.tableDiffs).toHaveLength(0)
    })

    it('detects new table', () => {
        const prev = createSnapshot([userDef])
        const curr = createSnapshot([userDef, postDef])
        const diff = diffSchemas(prev, curr)

        expect(diff.hasChanges).toBe(true)
        const created = diff.tableDiffs.find(t => t.changeType === 'created')
        expect(created?.table).toBe('posts')
    })

    it('detects dropped table', () => {
        const prev = createSnapshot([userDef, postDef])
        const curr = createSnapshot([userDef])
        const diff = diffSchemas(prev, curr)

        expect(diff.hasChanges).toBe(true)
        const dropped = diff.tableDiffs.find(t => t.changeType === 'dropped')
        expect(dropped?.table).toBe('posts')
    })

    it('detects added column', () => {
        const prev = createSnapshot([userDef])
        const updatedUser: ModelDef = {
            ...userDef,
            schema: {
                ...userDef.schema,
                age: field.int().nullable().build(),
            },
        }
        const curr = createSnapshot([updatedUser])
        const diff = diffSchemas(prev, curr)

        expect(diff.hasChanges).toBe(true)
        const altered = diff.tableDiffs.find(t => t.changeType === 'altered')
        const added = altered?.columnChanges.find(c => c.column === 'age')
        expect(added?.changeType).toBe('added')
    })

    it('detects removed column', () => {
        const prev = createSnapshot([userDef])
        const { email: _removed, ...restSchema } = userDef.schema
        const updatedUser: ModelDef = { ...userDef, schema: restSchema }
        const curr = createSnapshot([updatedUser])
        const diff = diffSchemas(prev, curr)

        const altered = diff.tableDiffs.find(t => t.changeType === 'altered')
        const removed = altered?.columnChanges.find(c => c.column === 'email')
        expect(removed?.changeType).toBe('removed')
    })

    it('detects type change', () => {
        const prev = createSnapshot([userDef])
        const updatedUser: ModelDef = {
            ...userDef,
            schema: {
                ...userDef.schema,
                name: field.text().build(), // was varchar(100)
            },
        }
        const curr = createSnapshot([updatedUser])
        const diff = diffSchemas(prev, curr)

        const altered = diff.tableDiffs.find(t => t.changeType === 'altered')
        const changed = altered?.columnChanges.find(c => c.column === 'name')
        expect(changed?.changeType).toBe('type_changed')
        expect(changed?.before?.type).toBe('varchar')
        expect(changed?.after?.type).toBe('text')
    })

    it('detects nullable change', () => {
        const prev = createSnapshot([userDef])
        const updatedUser: ModelDef = {
            ...userDef,
            schema: {
                ...userDef.schema,
                name: field.varchar(100).nullable().build(), // was notNullable
            },
        }
        const curr = createSnapshot([updatedUser])
        const diff = diffSchemas(prev, curr)

        const altered = diff.tableDiffs.find(t => t.changeType === 'altered')
        const changed = altered?.columnChanges.find(c => c.column === 'name')
        expect(changed?.changeType).toBe('nullable_changed')
    })

    it('detects default value change', () => {
        const defWithDefault: ModelDef = {
            ...userDef,
            schema: {
                ...userDef.schema,
                is_active: field.boolean().default(true).build(),
            },
        }
        const prev = createSnapshot([defWithDefault])
        const updated: ModelDef = {
            ...defWithDefault,
            schema: {
                ...defWithDefault.schema,
                is_active: field.boolean().default(false).build(),
            },
        }
        const curr = createSnapshot([updated])
        const diff = diffSchemas(prev, curr)

        const altered = diff.tableDiffs.find(t => t.changeType === 'altered')
        const changed = altered?.columnChanges.find(c => c.column === 'is_active')
        expect(changed?.changeType).toBe('default_changed')
    })

    it('detects foreign key change', () => {
        const prev = createSnapshot([postDef])
        const updatedPost: ModelDef = {
            ...postDef,
            schema: {
                ...postDef.schema,
                user_id: field.foreignId().constrained('users').cascadeOn('delete', 'update').build(),
            },
        }
        const curr = createSnapshot([updatedPost])
        const diff = diffSchemas(prev, curr)

        const altered = diff.tableDiffs.find(t => t.changeType === 'altered')
        const changed = altered?.columnChanges.find(c => c.column === 'user_id')
        expect(changed?.changeType).toBe('foreign_changed')
    })
})

// ─── generateDiffMigration ────────────────────────────────────────────────────

describe('generateDiffMigration', () => {
    let tmpDir: string
    let migrationsDir: string

    beforeEach(() => {
        tmpDir = makeTmpDir()
        migrationsDir = resolve(tmpDir, 'migrations')
        mkdirSync(migrationsDir, { recursive: true })
    })
    afterEach(() => { if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true }) })

    it('generates full create migration when no snapshot exists', () => {
        const filePath = generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        expect(filePath).not.toBeNull()
        const content = readFileSync(filePath!, 'utf-8')
        expect(content).toContain("createTable('users'")
    })

    it('saves snapshot after first migration', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        expect(existsSync(snapshotPath(tmpDir))).toBe(true)
    })

    it('returns null when no changes detected', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        const result = generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        expect(result).toBeNull()
    })

    it('generates alterTable for added column', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)

        const updatedUser: ModelDef = {
            ...userDef,
            schema: { ...userDef.schema, age: field.int().nullable().build() },
        }
        const filePath = generateDiffMigration([toDiscovered(updatedUser)], tmpDir, migrationsDir)
        expect(filePath).not.toBeNull()
        const content = readFileSync(filePath!, 'utf-8')
        expect(content).toContain("alterTable('users'")
        expect(content).toContain("specificType('age', 'int')")
    })

    it('generates dropColumn for removed column', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)

        const { email: _, ...restSchema } = userDef.schema
        const updatedUser: ModelDef = { ...userDef, schema: restSchema }
        const filePath = generateDiffMigration([toDiscovered(updatedUser)], tmpDir, migrationsDir)
        const content = readFileSync(filePath!, 'utf-8')
        expect(content).toContain("dropColumn('email')")
    })

    it('generates createTable for new model', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        const filePath = generateDiffMigration([toDiscovered(userDef), toDiscovered(postDef)], tmpDir, migrationsDir)
        const content = readFileSync(filePath!, 'utf-8')
        expect(content).toContain("createTable('posts'")
    })

    it('generates dropTableIfExists for removed model', () => {
        generateDiffMigration([toDiscovered(userDef), toDiscovered(postDef)], tmpDir, migrationsDir)
        const filePath = generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        const content = readFileSync(filePath!, 'utf-8')
        expect(content).toContain("dropTableIfExists('posts')")
    })

    it('migration has up and down functions', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)
        const updatedUser: ModelDef = {
            ...userDef,
            schema: { ...userDef.schema, bio: field.text().nullable().build() },
        }
        const filePath = generateDiffMigration([toDiscovered(updatedUser)], tmpDir, migrationsDir)
        const content = readFileSync(filePath!, 'utf-8')
        expect(content).toContain('export async function up')
        expect(content).toContain('export async function down')
    })

    it('updates snapshot after diff migration', () => {
        generateDiffMigration([toDiscovered(userDef)], tmpDir, migrationsDir)

        const updatedUser: ModelDef = {
            ...userDef,
            schema: { ...userDef.schema, age: field.int().nullable().build() },
        }
        generateDiffMigration([toDiscovered(updatedUser)], tmpDir, migrationsDir)

        const snap = loadSnapshot(tmpDir)!
        const userSnap = snap.models.find(m => m.identifier === 'User')
        expect(userSnap?.schema.age).toBeDefined()
    })
})
