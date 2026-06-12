import type { Knex } from "knex";
import type { Model } from "../types/relations";
import type { ModelOptions, WithInput, Wrapper } from "../types/models";
import type { ModelContext } from "./context";
import { ModelRegistry } from "./registry";
import { OeremBuilder } from "./builder";

/**
 * Model Class - OOP wrapper for model instances
 * Encapsulates model logic with context stored as private properties
 */
export class OeremModel<T extends Record<string, unknown>, U extends Record<string, unknown> = {}> implements Model<T, U> {
    public readonly tableName: string;
    private readonly context: ModelContext;

    constructor(
        tableName: string,
        getConnection: () => Knex,
        options: Partial<ModelOptions<T, U>> = {}
    ) {
        this.tableName = tableName;
        this.context = {
            tableName,
            options: options as unknown as Record<string, unknown>,
            getConnection,
            pk: (options.primaryKey || "id") as string,
            deletedAt: (options.deletedAtColumn || "deleted_at") as string,
        };
    }

    /**
     * Create a new Builder for this model with eager loading
     */
    with(...args: (WithInput<U> | string)[]): any {
        const builder = new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        );
        return builder.with(...args);
    }

    /**
     * Apply a custom query callback to the builder
     */
    query(callback: (q: any) => any): any {
        const builder = new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        );
        return builder.query(callback);
    }

    /**
     * Get all records without soft delete filter
     */
    all(): Promise<(T & U & Wrapper<U>)[]> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        ).get() as any;
    }

    /**
     * Find a record by primary key
     */
    find(id: number | string): Promise<(T & U & Wrapper<U>) | undefined> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        )
            .query((q: any) => q.where(this.context.pk, id))
            .first() as any;
    }

    /**
     * Include soft-deleted records
     */
    withTrashed(): any {
        const builder = new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        );
        return builder.withTrashed();
    }

    /**
     * Get only soft-deleted records
     */
    onlyTrashed(): any {
        const builder = new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        );
        return builder.onlyTrashed();
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T>): Promise<T & Wrapper<U>> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        ).create(data) as any;
    }

    /**
     * Insert multiple records
     */
    async insert(records: Partial<T>[]): Promise<void> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        ).insert(records) as any;
    }

    /**
     * Update a record by id
     */
    async update(id: number | string, data: Partial<T>): Promise<number> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        )
            .query((q: any) => q.where(this.context.pk, id))
            .update(data) as any;
    }

    /**
     * Delete a record by id
     */
    async delete(id: number | string): Promise<number> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        )
            .query((q: any) => q.where(this.context.pk, id))
            .delete() as any;
    }

    /**
     * Soft delete a record by id
     */
    async softDelete(id: number | string): Promise<number> {
        return new OeremBuilder(
            this.context,
            this.context.getConnection()<Record<string, unknown>>(this.tableName)
        )
            .query((q: any) => q.where(this.context.pk, id))
            .softDelete() as any;
    }
}

/**
 * Factory function that creates Model instances (backward compatible with old API)
 * This is used by createPool.createModel internally
 */
export function createModel<T extends Record<string, unknown>, U extends Record<string, unknown> = {}>(
    getConnection: () => Knex
) {
    return (tableName: string, options: Partial<ModelOptions<T, U>> = {}): OeremModel<T, U> => {
        const model = new OeremModel<T, U>(tableName, getConnection, options);

        // Register in registry for relation resolution
        ModelRegistry.register(
            tableName,
            model as unknown as Model<Record<string, unknown>, Record<string, unknown>>
        );

        return model;
    };
}
