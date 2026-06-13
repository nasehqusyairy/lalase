// ============================================================
// MODEL OPTIONS & TYPES
// ============================================================

import type { OeremModel } from "../core/model";
import type { Builder } from "./builder";

// 1. State untuk Soft Delete (Internal Builder)
export type SoftDeleteMode = 'active' | 'with' | 'only';

export interface ModelOptions<T, U = {}> {
    primaryKey: keyof T | string;
    timestamps: boolean;
    softDelete: boolean;
    deletedAtColumn: string;
    fillable: (keyof T)[];
    guarded: (keyof T)[];
    hidden: (keyof T)[];
    // Using any to avoid circular dependency - the actual validation happens at runtime
    relations: any;
}

// Helper untuk Autocomplete agar tidak collapsing
type LiteralUnion<T extends string> = T | (string & {});

export type TimeStampColumns = {
    created_at?: Date;
    updated_at?: Date;
}

export type SoftDeleteColumn = {
    deleted_at?: Date;
}

// --- CORE RELATION TYPES ---
export type WithCallback = <M>(query: InferBuilder<M>) => void;

// Untuk with() map, gunakan any agar bisa ditimpa
export type AnyWithCallback = WithCallback;

type RelatedCallback<V> =
    // Array dengan pivot → belongsToMany → dapat PivotMethods
    NonNullable<V> extends (infer Item)[]
    ? Item extends { pivot?: any }
    ? (r: PivotRelatedMethods<Omit<Item, 'pivot'>>) => Promise<void> | void
    : (r: RelatedMethods<Item extends Record<string, unknown> ? Item : never>) => Promise<void> | void
    // Object tunggal → hasOne/belongsTo → hanya RelatedMethods
    : NonNullable<V> extends Record<string, unknown>
    ? (r: RelatedMethods<NonNullable<V>>) => Promise<void> | void
    : never;

// Infer methods yang tersedia berdasarkan tipe relasi di U
// Using any to simplify - actual types are in relations.ts
export type RelatedInput<U extends Record<string, unknown>> = {
    [K in keyof U]?: RelatedCallback<U[K]>;
};

export type Wrapper<U extends Record<string, unknown>> = {
    related(input: RelatedInput<U>): Promise<void>;
}

// Methods untuk relasi biasa (hasMany, hasOne, belongsTo)
export type RelatedMethods<T extends Record<string, unknown>> = {
    create: (data: Partial<T>) => Promise<T>;
    update: (data: Partial<T>) => Promise<number>;
    delete: () => Promise<number>;
    softDelete: () => Promise<number>;
    insert: (records: Partial<T>[]) => Promise<void>;
}

// Methods khusus belongsToMany
export type PivotMethods = {
    attach: <T = {}>(ids: (number | string)[], extraPivotData?: T) => Promise<void>;
    detach: (ids: (number | string)[]) => Promise<void>;
    sync: (ids: (number | string)[]) => Promise<void>;
}

// Gabungan untuk belongsToMany
export type PivotRelatedMethods<T extends Record<string, unknown>> =
    RelatedMethods<T> & PivotMethods;

export type InferBuilder<M> = M extends OeremModel<infer T, infer U>
    ? Builder<T, U>
    : never;

export type WithInput<U extends Record<string, unknown> = Record<string, unknown>> =
    | (keyof U & string)
    | (keyof U & string)[]
    | string
    | string[]
    | { [K in keyof U]?: AnyWithCallback }
    | { [K: string]: AnyWithCallback };
