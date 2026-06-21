import type { ModelDef } from '../schema/types.js'

// ─── Hidden Field Processor ───────────────────────────────────────────────────
// Makes hidden fields non-enumerable on result objects so they:
// - remain accessible via obj.field
// - are excluded from JSON.stringify(), for...in, and object spread

export function applyHiddenFields<T extends object>(obj: T, def: ModelDef): T {
    for (const [col, meta] of Object.entries(def.schema)) {
        if (meta.isHidden && col in obj) {
            Object.defineProperty(obj, col, {
                value: (obj as Record<string, unknown>)[col],
                enumerable: false,
                writable: true,
                configurable: true,
            })
        }
    }
    return obj
}

export function applyHiddenFieldsToMany<T extends object>(rows: T[], def: ModelDef): T[] {
    return rows.map(row => applyHiddenFields(row, def))
}

// ─── Hash Processor ───────────────────────────────────────────────────────────
// Hashes fields with hashFn before insert/update

export async function applyHashing(
    data: Record<string, unknown>,
    def: ModelDef,
): Promise<Record<string, unknown>> {
    const result = { ...data }

    for (const [col, meta] of Object.entries(def.schema)) {
        if (meta.hashFn && col in result && result[col] !== null && result[col] !== undefined) {
            const raw = result[col]
            if (typeof raw !== 'string') {
                throw new TypeError(
                    `Field "${col}" has a hash function but received a non-string value: ${typeof raw}`
                )
            }
            result[col] = await meta.hashFn(raw)
        }
    }

    return result
}