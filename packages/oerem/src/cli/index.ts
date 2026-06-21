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
                generateDiffMigration(models, cwd, name)
                console.log(`\n  Done.\n`)
                break
            }

            // ── migrate ─────────────────────────────────────────────────────────────
            case 'migrate': {
                const knex = await buildKnex(config)
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
                const knex = await buildKnex(config)
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
                await simulateSchema(models, config.knex)
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

async function buildKnex(config: import('../schema/types.js').OeremConfig) {
    const { default: Knex } = await import('knex')
    return Knex({
        ...config.knex,
        migrations: {
            extension: 'ts',
            directory: './migrations',
            ...(typeof config.knex.migrations === 'object' ? config.knex.migrations : {}),
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