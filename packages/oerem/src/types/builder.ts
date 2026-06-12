import type { Knex } from "knex";
import type { SelectBuilder } from "../query/select";
import type { SoftDeleteMode, WithInput, Wrapper } from "./models";

// --- BUILDER INTERFACE ---
// T = Model Utama, U = Definisi Relasi
export interface Builder<T extends Record<string, unknown>, U extends Record<string, unknown> = {}> {
    toSQL(): Knex.Sql;

    // Soft Delete
    withTrashed(): this;
    onlyTrashed(): this;

    // Eager Loading
    with(map: { [K in keyof U]?: any }): this;
    with(dotNotation: string): this;
    with(...args: (WithInput<U> | string)[]): this;

    // Querying
    query(callback: (q: SelectBuilder<T>) => SelectBuilder<T>): this;

    // Execution (Return T & U untuk menggabungkan field asli + field relasi)
    get<R extends unknown = (T & U)>(): Promise<(R & Wrapper<U>)[]>;
    first<R = T & U>(): Promise<R | undefined>;

    // Persistence
    create(data: Partial<T>): Promise<T & Wrapper<U>>;
    update(data: Partial<T>): Promise<number>;
    delete(): Promise<number>;
    softDelete(): Promise<number>;
    insert(records: Partial<T>[]): Promise<void>;
}
