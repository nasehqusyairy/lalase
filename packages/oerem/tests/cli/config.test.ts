import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { getOeremConfig } from '../../src/cli/config.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
    const dir = resolve(tmpdir(), `oerem-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
    return dir
}

function writeConfig(dir: string, content: string) {
    writeFileSync(resolve(dir, 'oerem.config.ts'), content, 'utf-8')
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getOeremConfig', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = makeTmpDir()
    })

    afterEach(() => {
        if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
    })

    it('throws if oerem.config.ts does not exist', async () => {
        await expect(getOeremConfig(tmpDir)).rejects.toThrow('Config file not found')
    })

    it('throws if config has no default export', async () => {
        writeConfig(tmpDir, `export const foo = 'bar'`)
        await expect(getOeremConfig(tmpDir)).rejects.toThrow('must have a default export')
    })

    it('throws if required fields are missing', async () => {
        writeConfig(tmpDir, `export default { knex: {} }`)
        await expect(getOeremConfig(tmpDir)).rejects.toThrow('missing required field')
    })

    it('throws if inputFolder is not a string', async () => {
        writeConfig(tmpDir, `export default {
      knex: { client: 'sqlite3' },
      inputFolder: 123,
      outputFolder: './types',
      poolFile: './pool.ts'
    }`)
        await expect(getOeremConfig(tmpDir)).rejects.toThrow('"inputFolder" must be a string')
    })

    it('returns valid config', async () => {
        writeConfig(tmpDir, `export default {
      knex: { client: 'sqlite3', connection: ':memory:' },
      inputFolder: './models',
      outputFolder: './types',
      poolFile: './pool.ts'
    }`)

        const config = await getOeremConfig(tmpDir)
        expect(config.knex).toEqual({ client: 'sqlite3', connection: ':memory:' })
        expect(config.inputFolder).toBe('./models')
        expect(config.outputFolder).toBe('./types')
        expect(config.poolFile).toBe('./pool.ts')
    })
})