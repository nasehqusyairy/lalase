import type { AnyModelDef, RelationMeta } from './types.js'

// ─── Relation Helpers ─────────────────────────────────────────────────────────

/**
 * One-to-many: this model has many of the related model.
 *
 * @example
 * relations: {
 *   posts: hasMany(() => postModel, 'user_id'),
 * }
 */
export function hasMany(
    ref: () => AnyModelDef,
    foreignKey: string,
): RelationMeta {
    return { type: 'hasMany', ref, foreignKey }
}

/**
 * One-to-one: this model has one of the related model.
 *
 * @example
 * relations: {
 *   profile: hasOne(() => profileModel, 'user_id'),
 * }
 */
export function hasOne(
    ref: () => AnyModelDef,
    foreignKey: string,
): RelationMeta {
    return { type: 'hasOne', ref, foreignKey }
}

/**
 * Inverse of hasMany / hasOne: this model belongs to the related model.
 *
 * @example
 * relations: {
 *   user: belongsTo(() => userModel, 'user_id'),
 * }
 */
export function belongsTo(
    ref: () => AnyModelDef,
    foreignKey: string,
): RelationMeta {
    return { type: 'belongsTo', ref, foreignKey }
}

/**
 * Many-to-many via pivot table.
 *
 * @param ref          - Lazy reference to the related model definition
 * @param pivotTable   - Name of the pivot/junction table
 * @param foreignKey   - FK on pivot pointing to this model
 * @param relatedForeignKey - FK on pivot pointing to the related model
 *
 * @example
 * relations: {
 *   roles: belongsToMany(() => roleModel, 'user_roles', 'user_id', 'role_id'),
 * }
 */
export function belongsToMany(
    ref: () => AnyModelDef,
    pivotTable: string,
    foreignKey: string,
    relatedForeignKey: string,
): RelationMeta {
    return { type: 'belongsToMany', ref, foreignKey, pivotTable, relatedForeignKey }
}