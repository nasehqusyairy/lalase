import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type { OeremConfig } from '../schema/types.js'

// ─── Config Loader ────────────────────────────────────────────────────────────

const CONFIG_FILENAME = 'oerem.config.ts'

export async function getOeremConfig(cwd: string = process.cwd()): Promise<OeremConfig> {
    const configPath = resolve(cwd, CONFIG_FILENAME)

    if (!existsSync(configPath)) {
        throw new Error(
            `Config file not found: ${configPath}\n` +
            `Create an ${CONFIG_FILENAME} file at the root of your project.`
        )
    }

    const fileUrl = pathToFileURL(configPath).href

    let mod: unknown
    try {
        mod = await import(fileUrl)
    } catch (err) {
        throw new Error(
            `Failed to load ${CONFIG_FILENAME}:\n${String(err)}`
        )
    }

    const config = (mod as Record<string, unknown>).default

    if (!config || typeof config !== 'object') {
        throw new Error(
            `${CONFIG_FILENAME} must have a default export that is an object satisfying OeremConfig.`
        )
    }

    validateConfig(config as Record<string, unknown>, configPath)

    return config as OeremConfig
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateConfig(config: Record<string, unknown>, configPath: string): void {
    const required = ['inputFolder', 'outputFolder', 'poolFile', 'migrationsFolder', 'seedsFolder'] as const

    for (const key of required) {
        if (config[key] === undefined || config[key] === null) {
            throw new Error(
                `${CONFIG_FILENAME}: missing required field "${key}".\n` +
                `Check your config at ${configPath}`
            )
        }
    }

    if (typeof config.inputFolder !== 'string') {
        throw new Error(`${CONFIG_FILENAME}: "inputFolder" must be a string.`)
    }

    if (typeof config.outputFolder !== 'string') {
        throw new Error(`${CONFIG_FILENAME}: "outputFolder" must be a string.`)
    }

    if (typeof config.poolFile !== 'string') {
        throw new Error(`${CONFIG_FILENAME}: "poolFile" must be a string.`)
    }

    if (typeof config.migrationsFolder !== 'string') {
        throw new Error(`${CONFIG_FILENAME}: "migrationsFolder" must be a string.`)
    }

    if (typeof config.seedsFolder !== 'string') {
        throw new Error(`${CONFIG_FILENAME}: "seedsFolder" must be a string.`)
    }
}
