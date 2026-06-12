import type { Model, HasMany, HasOne, BelongsTo, BelongsToMany } from "../types/relations";

// Sekarang setiap helper return tipe yang spesifik
export const hasMany = <T extends Record<string, unknown>>(
    modelThunk: () => Model<T, any>,
    foreignKey: string,
    localKey = 'id'
): HasMany<T> => ({
    _type: 'hasMany', // phantom, tidak pernah digunakan runtime
    modelThunk,
    foreignKey,
    localKey,
});

export const hasOne = <T extends Record<string, unknown>>(
    modelThunk: () => Model<T, any>,
    foreignKey: string,
    localKey = 'id'
): HasOne<T> => ({
    _type: 'hasOne',
    modelThunk,
    foreignKey,
    localKey,
});

export const belongsTo = <T extends Record<string, unknown>>(
    modelThunk: () => Model<T, any>,
    foreignKey: string,
    ownerKey = 'id'
): BelongsTo<T> => ({
    _type: 'belongsTo',
    modelThunk,
    foreignKey,
    localKey: ownerKey,
});

export const belongsToMany = <T extends Record<string, unknown>>(
    modelThunk: () => Model<T, any>,
    pivotTable: string,
    foreignPivotKey: string,
    relatedPivotKey: string,
    parentKey = 'id',
    foreignKey = 'id'
): BelongsToMany<T> => ({
    _type: 'belongsToMany',
    modelThunk,
    pivotTable,
    foreignPivotKey,
    relatedPivotKey,
    localKey: parentKey,
    foreignKey,
});
