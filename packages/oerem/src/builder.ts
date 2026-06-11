import type { Knex } from "knex";
import { executeGet } from "./executor";
import { wrapOutput } from "./wrap-output";
import type { Builder, SoftDeleteMode, WithInput, Wrapper } from "./types";
import { applySecurity, controlOutput } from "./helper";
import type { SelectBuilder } from "./select-builder";
import type { ModelContext } from "./context";

/**
 * Builder Class - OOP wrapper for query builder
 * Stores state as class properties instead of closure variables
 */
export class OeremBuilder<T extends Record<string, unknown> = Record<string, unknown>, U extends Record<string, unknown> = {}> implements Builder<T, U> {
    private withRelations: (WithInput<Record<string, unknown>> | string)[] = [];
    private currentQuery: Knex.QueryBuilder<Record<string, unknown>, unknown[]>;
    private softDeleteMode: SoftDeleteMode = 'active';
    private readonly ctx: ModelContext;

    constructor(
        ctx: ModelContext,
        queryInstance: Knex.QueryBuilder<Record<string, unknown>, unknown[]>
    ) {
        this.ctx = ctx;
        this.currentQuery = queryInstance;
    }

    /**
     * Include soft-deleted records in results
     */
    withTrashed(): this {
        this.softDeleteMode = 'with';
        return this;
    }

    /**
     * Get only soft-deleted records
     */
    onlyTrashed(): this {
        this.softDeleteMode = 'only';
        return this;
    }

    /**
     * Add eager loading relations
     */
    with(...args: (WithInput<Record<string, unknown>> | string)[]): this {
        this.withRelations.push(...args);
        return this;
    }

    /**
     * Apply a custom query callback
     */
    query(callback: (q: SelectBuilder<T>) => SelectBuilder<T>): this {
        callback(this.currentQuery as unknown as SelectBuilder<T>);
        return this;
    }

    /**
     * Get SQL query representation
     */
    toSQL() {
        return this.currentQuery.toSQL();
    }

    /**
     * Execute query and get all results
     */
    async get<R = Record<string, unknown>>(): Promise<(R & Wrapper<Record<string, unknown>>)[]> {
        return await executeGet<R, Record<string, unknown>>(
            this.currentQuery,
            this.ctx.options as any,
            this.ctx.tableName,
            this.ctx.deletedAt,
            this.softDeleteMode,
            this.withRelations as WithInput[],
            this.ctx.getConnection
        ) as any;
    }

    /**
     * Get first result
     */
    async first<R = Record<string, unknown>>(): Promise<R | undefined> {
        if (this.ctx.options.softDelete) {
            this.currentQuery.whereNull(this.ctx.deletedAt);
        }
        const results = await this.get<R[]>();
        return controlOutput([results[0]], this.ctx.options as any)[0] as R | undefined;
    }

    /**
     * Create a new record
     */
    async create(data: any): Promise<any> {
        const filtered = applySecurity(data, this.ctx.options as any);
        const payload = { ...filtered } as Record<string, unknown>;
        if (this.ctx.options.timestamps !== false) {
            const now = this.ctx.getConnection().fn.now();
            payload.created_at = payload.created_at || now;
            payload.updated_at = payload.updated_at || now;
        }
        const [insertedId] = await this.ctx.getConnection()(this.ctx.tableName).insert(payload);
        const pkKey = this.ctx.pk as keyof Record<string, unknown>;
        const results = [{ [pkKey]: (data as Record<string, unknown>)[pkKey] || insertedId, ...payload }];
        wrapOutput(results, this.ctx.options as any, this.ctx.getConnection);
        return results[0];
    }

    /**
     * Update all records matching query
     */
    async update(data: any) {
        const filtered = applySecurity(data, this.ctx.options as any);
        const payload = { ...filtered } as Record<string, unknown>;
        if (this.ctx.options.timestamps !== false) {
            payload.updated_at = payload.updated_at || this.ctx.getConnection().fn.now();
        }
        return this.currentQuery.update(payload as never);
    }

    /**
     * Insert multiple records
     */
    async insert(records: any[]): Promise<void> {
        const payloads = records.map(data => {
            const filtered = applySecurity(data, this.ctx.options as any);
            const payload = { ...filtered } as Record<string, unknown>;
            if (this.ctx.options.timestamps !== false) {
                const now = this.ctx.getConnection().fn.now();
                payload.created_at = payload.created_at || now;
                payload.updated_at = payload.updated_at || now;
            }
            return payload;
        });
        await this.ctx.getConnection()(this.ctx.tableName).insert(payloads);
    }

    /**
     * Delete all records matching query
     */
    async delete() {
        return this.currentQuery.del() as any;
    }

    /**
     * Soft delete all records matching query
     */
    async softDelete() {
        if (!this.ctx.options.softDelete) throw new Error("Soft delete disabled");
        return this.currentQuery.update({ [this.ctx.deletedAt]: this.ctx.getConnection().fn.now() } as never) as any;
    }
}