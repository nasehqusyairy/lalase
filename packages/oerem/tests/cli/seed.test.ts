import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { generateSeeder } from '../../src/cli/generators/seed.generator.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
    const dir = resolve(tmpdir(), `oerem-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
    return dir
}

// ─── Generate Seeder Tests ────────────────────────────────────────────────────────

describe('generateSeeder', () => {
    let tmpDir: string

    beforeEach(() => { tmpDir = makeTmpDir() })
    afterEach(() => { if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true }) })

    it('creates seeds folder if it does not exist', () => {
        const seedsFolder = resolve(tmpDir, 'seeds')
        generateSeeder(seedsFolder, 'users')
        expect(existsSync(seedsFolder)).toBe(true)
    })

    it('generates a seeder file', () => {
        const filePath = generateSeeder(tmpDir, 'users')
        expect(existsSync(filePath)).toBe(true)
        expect(filePath).toMatch(/\.seeder\.ts$/)
    })

    it('seeder file has export function', () => {
        const filePath = generateSeeder(tmpDir, 'users')
        const content = readFileSync(filePath, 'utf-8')
        expect(content).toContain('export const seed = async function(knex: Knex)')
    })

    it('uses provided name in filename', () => {
        const filePath = generateSeeder(tmpDir, 'roles')
        expect(filePath).toContain('roles.seeder.ts')
    })

    it('includes table name in template comment', () => {
        const filePath = generateSeeder(tmpDir, 'users')
        const content = readFileSync(filePath, 'utf-8')
        expect(content).toContain("knex('users')")
    })

    it('includes onConflict for upsert behavior', () => {
        const filePath = generateSeeder(tmpDir, 'users')
        const content = readFileSync(filePath, 'utf-8')
        expect(content).toContain('onConflict')
        expect(content).toContain('merge')
    })
})
