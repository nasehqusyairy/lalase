// ============================================================
// RELATIONS INDEX - Re-export all relation modules
// ============================================================

// Re-export relation definitions
export { hasMany, hasOne, belongsTo, belongsToMany } from './definitions';

// Re-export relation handler
export { RelationHandler, createRelationHandler } from './handler';

// Re-export eager loading
export { applyEagerLoading } from './eager-loading';
