import { readdirSync, existsSync } from 'node:fs'
import { resolve, extname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import type { ModelDef } from '../schema/types.js'

// ─── Resolve tsx binary from oerem's own node_modules ────────────────────────
// This ensures we use the tsx that oerem depends on, not whatever is in PATH.

const _require = createRequire(import.meta.url)

function resolveTsxBin(): string {
    try {
        // Resolve tsx package, then find its bin
        const tsxPkg = _require.resolve('tsx/package.json')
        const tsxRoot = tsxPkg.replace('/package.json', '')
        const bin = resolve(tsxRoot, '../.bin/tsx')
        if (existsSync(bin)) return bin
    } catch { }
    // Fallback: hope tsx is in PATH (e.g. installed at workspace root)
    return 'tsx'
}

// ─── Model Scanner ────────────────────────────────────────────────────────────

export interface DiscoveredModel {
    filePath: string
    fileName: string   // e.g. "user.model.ts"
    modelName: string  // e.g. "user.model"
    def: ModelDef
}

const MODEL_PATTERN = /\.model\.(ts|js)$/

// ─── Load a single model file via tsx child process ───────────────────────────
// We use a tsx child process to evaluate the model file because:
// 1. Model files are TypeScript and may import other .ts files without .js extension
// 2. Dynamic import() under Node ESM cannot resolve extensionless .ts imports
// 3. tsx handles all of this correctly as a full TypeScript runtime

async function loadModelFile(filePath: string): Promise<unknown> {
    // First attempt: direct dynamic import (works if CLI is already running under tsx
    // and all imports use .js extensions)
    try {
        const fileUrl = pathToFileURL(filePath).href
        const mod = await import(fileUrl)
        return mod
    } catch {
        // Second attempt: spawn tsx child process to serialize the default export as JSON
        return loadModelViaTsx(filePath)
    }
}

function loadModelViaTsx(filePath: string): unknown {
    const tsxBin = resolveTsxBin()
    const script = `
import model from ${JSON.stringify(filePath)};

// FieldMeta objects contain functions (hashFn) which are not JSON serializable.
// We strip them before serializing.
function stripFunctions(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'function') continue;
    result[k] = stripFunctions(v);
  }
  return result;
}

// Relations contain lazy ref functions — strip those too,
// but preserve enough metadata for the scanner to work.
function serializeRelations(relations) {
  if (!relations) return undefined;
  const result = {};
  for (const [key, rel] of Object.entries(relations)) {
    const resolved = rel.ref();
    const serialized = {
      type: rel.type,
      foreignKey: rel.foreignKey,
      pivotTable: rel.pivotTable,
      relatedForeignKey: rel.relatedForeignKey,
      // Store resolved ref identifier so we can reconstruct a lazy ref
      _refIdentifier: resolved.identifier,
    };

    // Serialize pivotRef for belongsToMany relations
    if (rel.pivotRef) {
      const pivotResolved = rel.pivotRef();
      serialized._pivotRefIdentifier = pivotResolved.identifier;
    }

    result[key] = serialized;
  }
  return result;
}

const serializable = {
  identifier: model.identifier,
  table: model.table,
  schema: stripFunctions(model.schema),
  relations: serializeRelations(model.relations),
};

process.stdout.write(JSON.stringify(serializable));
`

    let output: string
    try {
        output = execSync(`${tsxBin} --input-type=module`, {
            input: script,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        })
    } catch (err: unknown) {
        const execErr = err as { stderr?: string; message?: string }
        throw new Error(execErr.stderr ?? execErr.message ?? String(err))
    }

    const parsed = JSON.parse(output) as Record<string, unknown>

    // Reconstruct lazy refs for relations from serialized identifiers
    if (parsed.relations && typeof parsed.relations === 'object') {
        const relations = parsed.relations as Record<string, Record<string, unknown>>
        for (const [, rel] of Object.entries(relations)) {
            const refId = rel._refIdentifier as string
            delete rel._refIdentifier
            // Lazy ref returns a stub — enough for type generation and registry generation
            rel.ref = () => ({ identifier: refId, table: '', schema: {} })

            // Reconstruct pivotRef for belongsToMany relations
            if (rel._pivotRefIdentifier !== undefined) {
                const pivotRefId = rel._pivotRefIdentifier as string
                delete rel._pivotRefIdentifier
                rel.pivotRef = () => ({ identifier: pivotRefId, table: '', schema: {} })
            }
        }
    }

    return { default: parsed }
}

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

        let mod: unknown
        try {
            mod = await loadModelFile(filePath)
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