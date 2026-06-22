#!/usr/bin/env node

import { resolve } from 'node:path'
import { getOeremConfig } from './config.js'
import { scanModels } from './scanner.js'
import { generateTypes } from './generators/types.generator.js'
import { generateRegistry } from './generators/registry.generator.js'
import { simulateSchema } from './generators/migration.generator.js'
import { generateDiffMigration, saveSnapshot } from './generators/diff.generator.js'

// ─── CLI ──────────────────────────────────────────────────────────────────────

const COMMANDS = [
    'generate:types',
    'generate:registry',
    'generate:migration',
    'migrate',
    'rollback',
    'simulate',
] as const

type Command = typeof COMMANDS[number]

async function main() {
    const [, , rawCommand, ...args] = process.argv
    const command = rawCommand as Command

    if (!command || !COMMANDS.includes(command)) {
        printHelp()
        process.exit(command ? 1 : 0)
    }

    const cwd = process.cwd()

    console.log(`\noerem › ${command}\n`)

    try {
        const config = await getOeremConfig(cwd)
        const inputFolder = resolve(cwd, config.inputFolder)
        const outputFolder = resolve(cwd, config.outputFolder)
        const migrationsFolder = resolve(cwd, config.migrationsFolder)

        switch (command) {

            // ── generate:types ──────────────────────────────────────────────────────
            case 'generate:types': {
                const models = await scanModels(inputFolder)
                if (models.length === 0) {
                    console.warn('  ⚠ No model files found in', inputFolder)
                    break
                }
                generateTypes(models, outputFolder)
                console.log(`\n  Done. ${models.length} type file(s) generated.\n`)
                break
            }

            // ── generate:registry ───────────────────────────────────────────────────
            case 'generate:registry': {
                const models = await scanModels(inputFolder)
                if (models.length === 0) {
                    console.warn('  ⚠ No model files found in', inputFolder)
                    break
                }
                generateRegistry(models, inputFolder, outputFolder, resolve(cwd, config.poolFile))
                console.log(`\n  Done. Registry generated.\n`)
                break
            }

            // ── generate:migration ──────────────────────────────────────────────────
            case 'generate:migration': {
                const models = await scanModels(inputFolder)
                if (models.length === 0) {
                    console.warn('  ⚠ No model files found in', inputFolder)
                    break
                }
                const name = args[0] ?? 'schema_update'
                generateDiffMigration(models, cwd, migrationsFolder, name)
                console.log(`\n  Done.\n`)
                break
            }

            // ── migrate ─────────────────────────────────────────────────────────────
            case 'migrate': {
                const knex = await buildKnexFromPool(resolve(cwd, config.poolFile), migrationsFolder)
                try {
                    const [batch, files] = await knex.migrate.latest()
                    if (files.length === 0) {
                        console.log('  Already up to date.')
                    } else {
                        console.log(`  Batch ${batch} — ran ${files.length} migration(s):`)
                        files.forEach((f: string) => console.log(`    ✔ ${f}`))
                    }
                } finally {
                    await knex.destroy()
                }
                console.log()
                break
            }

            // ── rollback ────────────────────────────────────────────────────────────
            case 'rollback': {
                const knex = await buildKnexFromPool(resolve(cwd, config.poolFile), migrationsFolder)
                try {
                    const [batch, files] = await knex.migrate.rollback()
                    if (files.length === 0) {
                        console.log('  Nothing to rollback.')
                    } else {
                        console.log(`  Rolled back batch ${batch} — ${files.length} migration(s):`)
                        files.forEach((f: string) => console.log(`    ✔ ${f}`))
                    }
                } finally {
                    await knex.destroy()
                }
                console.log()
                break
            }

            // ── simulate ────────────────────────────────────────────────────────────
            case 'simulate': {
                const models = await scanModels(inputFolder)
                if (models.length === 0) {
                    console.warn('  ⚠ No model files found in', inputFolder)
                    break
                }
                const knexConfig = await loadKnexConfigFromPool(resolve(cwd, config.poolFile))
                await simulateSchema(models, knexConfig)
                console.log()
                break
            }
        }

    } catch (err) {
        console.error('\n  ✖ Error:', err instanceof Error ? err.message : String(err))
        process.exit(1)
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Load knex config from pool file via tsx ──────────────────────────────────
// The pool file exports an OeremPool instance. We extract its knex config
// by reading the pool file's default export knex configuration via child process.

async function loadKnexConfigFromPool(
    poolFile: string,
): Promise<import('knex').Knex.Config> {
    const { execSync } = await import('node:child_process')
    const { createRequire } = await import('node:module')
    const { existsSync } = await import('node:fs')

    // Resolve .ts extension if not provided
    const resolved = existsSync(poolFile)
        ? poolFile
        : existsSync(`${poolFile}.ts`)
            ? `${poolFile}.ts`
            : poolFile

    const _require = createRequire(import.meta.url)
    let tsxBin: string
    try {
        const tsxPkg = _require.resolve('tsx/package.json')
        const tsxRoot = tsxPkg.replace('/package.json', '')
        const bin = `${tsxRoot}/../.bin/tsx`
        tsxBin = existsSync(bin) ? bin : 'tsx'
    } catch {
        tsxBin = 'tsx'
    }

    const script = `
import pool from ${JSON.stringify(resolved)};
const knex = pool.getKnex();
const config = knex.client.config;
process.stdout.write(JSON.stringify({
  client: config.client,
  connection: config.connection,
  pool: config.pool,
  searchPath: config.searchPath,
}));
`

    const output = execSync(`${tsxBin} --input-type=module`, {
        input: script,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
    })

    return JSON.parse(output) as import('knex').Knex.Config
}

async function buildKnexFromPool(poolFile: string, migrationsFolder: string) {
    const { default: Knex } = await import('knex')
    const knexConfig = await loadKnexConfigFromPool(poolFile)
    return Knex({
        ...knexConfig,
        migrations: {
            extension: 'ts',
            directory: migrationsFolder,
        },
    })
}

function printHelp() {
    console.log(`
oerem — model-driven ORM for TypeScript

Usage:
  oerem <command> [options]

Commands:
  generate:types       Generate TypeScript types from model schemas
  generate:registry    Generate index.ts model registry in input folder
  generate:migration   Generate a Knex migration file from model schemas
  migrate              Run pending migrations
  rollback             Rollback the last migration batch
  simulate             Sync tables to DB directly without creating a migration
`)
}

main()