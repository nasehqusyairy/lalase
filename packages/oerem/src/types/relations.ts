// ============================================================
// RELATION TYPES
// ============================================================

import type { OeremBuilder } from "../core/builder";
import type { SelectBuilder } from "../query/select";
import type { Wrapper } from "./models";

export type RelationType = 'hasMany' | 'hasOne' | 'belongsTo' | 'belongsToMany';

export type Model<T extends Record<string, unknown>, U extends Record<string, unknown> = {}> = {
    tableName: string;

    with(relation: keyof U & string): OeremBuilder<T, U>;
    with(relations: (keyof U & string)[]): OeremBuilder<T, U>;
    with(map: { [K in keyof U]?: any }): OeremBuilder<T, U>;
    with(dotNotation: string): OeremBuilder<T, U>;
    with(...args: (any | string)[]): OeremBuilder<T, U>;

    query(callback: (q: SelectBuilder<T>) => any): OeremBuilder<T, U>;

    withTrashed(): OeremBuilder<T, U>;
    onlyTrashed(): OeremBuilder<T, U>;

    // Direct actions
    all(): Promise<(T & U & any)[]>;
    find(id: number | string): Promise<(T & U & any) | undefined>;
    create(data: Partial<T>): Promise<T & Wrapper<U>>;
    insert(records: Partial<T>[]): Promise<void>;
    update(id: number | string, data: Partial<T>): Promise<number>;
    delete(id: number | string): Promise<number>;
    softDelete(id: number | string): Promise<number>;
}

// T = tipe target model
export interface HasMany<T extends Record<string, unknown>> {
    readonly _type: 'hasMany';
    modelThunk: () => Model<T, any>;
    foreignKey: string;
    localKey: string;
}

export interface HasOne<T extends Record<string, unknown>> {
    readonly _type: 'hasOne';
    modelThunk: () => Model<T, any>;
    foreignKey: string;
    localKey: string;
}

export interface BelongsTo<T extends Record<string, unknown>> {
    readonly _type: 'belongsTo';
    modelThunk: () => Model<T, any>;
    foreignKey: string;
    localKey: string;
}

export interface BelongsToMany<T extends Record<string, unknown>> {
    readonly _type: 'belongsToMany';
    modelThunk: () => Model<T, any>;
    pivotTable: string;
    foreignPivotKey: string;
    relatedPivotKey: string;
    localKey: string;
    foreignKey: string;
}

// Union untuk backward compat
export type RelationConfig =
    | HasMany<any>
    | HasOne<any>
    | BelongsTo<any>
    | BelongsToMany<any>;

// Ambil tipe "isi" dari array atau object
type Unwrap<T> =
    T extends (infer I)[] ? I :  // T[] → I
    T extends (infer I) | undefined ? I :  // T | undefined → I
    T;

// Dari value di U, tentukan RelationConfig yang valid
export type InferRelationConfig<V> =
    // Jika value adalah array → hasMany atau belongsToMany
    NonNullable<V> extends (infer Item)[]
    ? Item extends Record<string, unknown>
    ? HasMany<Item> | BelongsToMany<Item>
    : never
    // Jika value adalah object → hasOne atau belongsTo
    : NonNullable<V> extends Record<string, unknown>
    ? HasOne<NonNullable<V>> | BelongsTo<NonNullable<V>>
    : never;

// Map seluruh U menjadi konfigurasi relasi yang valid
export type RelationsMap<U extends Record<string, unknown>> = {
    [K in keyof U]-?: InferRelationConfig<U[K]>
};

export type BelongsToManyColumn<T, P> = (T & { pivot?: P })[]

// Untuk with() map, gunakan any agar bisa ditimpa
export type WithInput<U extends Record<string, unknown> = Record<string, unknown>> =
    | (keyof U & string)
    | (keyof U & string)[]
    | string
    | string[]
    | { [K in keyof U]?: any }
    | { [K: string]: any };
