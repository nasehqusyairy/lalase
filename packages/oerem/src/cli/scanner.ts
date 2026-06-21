import { readdirSync, existsSync } from 'node:fs'
import { resolve, extname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ModelDef } from '../schema/types.js'

// ─── Model Scanner ────────────────────────────────────────────────────────────

export interface DiscoveredModel {
    filePath: string
    fileName: string   // e.g. "user.model.ts"
    modelName: string  // e.g. "user.model"
    def: ModelDef
}

const MODEL_PATTERN = /\.model\.(ts|js)$/

export async function scanModels(inputFolder: string): Promise<DiscoveredModel[]> {
    if (!existsSync(inputFolder)) {
        throw new Error(`Input folder not found: ${inputFolder}`)
    }

    const files = readdirSync(inputFolder).filter(f => MODEL_PATTERN.test(f))

    if (files.length === 0) {
        return []
    }

    const models: DiscoveredModel[] = []

    for (const fileName of files) {
        const filePath = resolve(inputFolder, fileName)
        const fileUrl = pathToFileURL(filePath).href

        let mod: unknown
        try {
            mod = await import(fileUrl)
        } catch (err) {
            throw new Error(`Failed to load model file "${fileName}":\n${String(err)}`)
        }

        const def = (mod as Record<string, unknown>).default

        if (!def || typeof def !== 'object') {
            throw new Error(
                `Model file "${fileName}" must have a default export that is a model definition object.`
            )
        }

        validateModelDef(def as Record<string, unknown>, fileName)

        const modelName = basename(fileName, extname(fileName)).replace(/\.(ts|js)$/, '')

        models.push({
            filePath,
            fileName,
            modelName,
            def: def as ModelDef,
        })
    }

    return models
}

// ─── Model Def Validation ─────────────────────────────────────────────────────

function validateModelDef(def: Record<string, unknown>, fileName: string): void {
    if (typeof def.identifier !== 'string' || !def.identifier) {
        throw new Error(`Model "${fileName}": "identifier" must be a non-empty string.`)
    }

    if (typeof def.table !== 'string' || !def.table) {
        throw new Error(`Model "${fileName}": "table" must be a non-empty string.`)
    }

    if (!def.schema || typeof def.schema !== 'object') {
        throw new Error(`Model "${fileName}": "schema" must be an object.`)
    }
}