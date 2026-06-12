// ============================================================
// TYPES INDEX - Re-export all type sub-modules
// ============================================================

// Re-export from relations (must be first to avoid circular deps)
export type {
    RelationType,
    HasMany,
    HasOne,
    BelongsTo,
    BelongsToMany,
    RelationConfig,
    WithInput,
    Unwrap,
    InferRelationConfig,
    RelationsMap,
    BelongsToManyColumn,
    Model,
} from './relations';

// Re-export from models
export type {
    SoftDeleteMode,
    ModelOptions,
    TimeStampColumns,
    SoftDeleteColumn,
    WithCallback,
    AnyWithCallback,
    RelatedInput,
    Wrapper,
    RelatedMethods,
    PivotMethods,
    PivotRelatedMethods,
    InferModel,
} from './models';

// Re-export from builder
export type {
    Builder,
} from './builder';
