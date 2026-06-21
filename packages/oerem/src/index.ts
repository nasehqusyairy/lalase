// ─── Schema ───────────────────────────────────────────────────────────────────
export { field } from './schema/field.js'
export { hasMany, hasOne, belongsTo, belongsToMany } from './schema/relations.js'
export type {
    OeremConfig,
    ModelDef,
    FieldMeta,
    RelationMeta,
    RelationType,
    SqlColumnType,
    CascadeEvent,
    HashFn,
    InferSchema,
    AnyModelDef,
} from './schema/types.js'

// ─── Runtime ──────────────────────────────────────────────────────────────────
export { OeremModel } from './runtime/model.js'
export { OeremPool, createPool } from './runtime/pool.js'
export { applyHiddenFields, applyHiddenFieldsToMany, applyHashing } from './runtime/processor.js'
export type { PaginateResult, OrderDirection } from './runtime/model.js'

// ─── CLI (programmatic access) ────────────────────────────────────────────────
export { getOeremConfig } from './cli/config.js'
export { scanModels } from './cli/scanner.js'
export { generateTypes } from './cli/generators/types.generator.js'
export { generateRegistry } from './cli/generators/registry.generator.js'
export { generateMigration, simulateSchema } from './cli/generators/migration.generator.js'
export { generateDiffMigration, saveSnapshot, loadSnapshot } from './cli/generators/diff.generator.js'