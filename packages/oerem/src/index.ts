// ─── Schema ───────────────────────────────────────────────────────────────────
export { field } from './schema/field.js'
export { hasMany, hasOne, belongsTo, belongsToMany } from './schema/relations.js'
export type {
    OeremConfig,
    KnexConfig,
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
export { OeremQueryBuilder } from './runtime/query-builder.js'
export { applyHiddenFields, applyHiddenFieldsToMany, applyHashing } from './runtime/processor.js'
export type { PaginateResult, OrderDirection } from './runtime/model.js'

// ─── Utility types ────────────────────────────────────────────────────────────

import type { OeremModel } from './runtime/model.js'
import type { OeremQueryBuilder } from './runtime/query-builder.js'

/**
 * Infer the QueryBuilder type from an OeremModel instance.
 *
 * @example
 * import { User } from './models'
 * import type { InferQueryBuilder } from '@lalase/oerem'
 *
 * type UserQB = InferQueryBuilder<typeof User>
 * // → OeremQueryBuilder<TUser, RUser>
 *
 * function applyScope(q: UserQB): UserQB {
 *   return q.where('is_active', true)
 * }
 */
export type InferQueryBuilder<M> =
    M extends OeremModel<infer T, infer R>
    ? OeremQueryBuilder<T, R>
    : never

/**
 * Infer the row type T from an OeremModel instance.
 *
 * @example
 * import { User } from './models'
 * import type { InferModel } from '@lalase/oerem'
 *
 * type UserRow = InferModel<typeof User>
 * // → TUser
 */
export type InferModel<M> =
    M extends OeremModel<infer T, infer R>
    ? T
    : never

// ─── CLI (programmatic access) ────────────────────────────────────────────────
export { getOeremConfig } from './cli/config.js'
export { scanModels } from './cli/scanner.js'
export { generateTypes } from './cli/generators/types.generator.js'
export { generateRegistry } from './cli/generators/registry.generator.js'
export { generateMigration, simulateSchema } from './cli/generators/migration.generator.js'
export { generateDiffMigration, saveSnapshot, loadSnapshot } from './cli/generators/diff.generator.js'