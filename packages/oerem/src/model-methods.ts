import type { Knex } from "knex";
import type { WithInput } from "./types";
import type { SelectBuilder } from "./select-builder";
import type { ModelContext } from "./context";
import { createBuilder } from "./builder";

/**
 * Core Methods - Shared across all model instances
 * Exists only once in memory to optimize memory footprint
 * when creating multiple models
 */
export const coreMethods = {
    with(ctx: ModelContext, ...args: (WithInput<Record<string, unknown>> | string)[]) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).with(...args);
    },

    query(ctx: ModelContext, cb: (q: SelectBuilder<Record<string, unknown>>) => SelectBuilder<Record<string, unknown>>) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).query(cb);
    },

    all(ctx: ModelContext) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).get();
    },

    find(ctx: ModelContext, id: number | string) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName))
            .query(q => q.where(ctx.pk, id))
            .first();
    },

    withTrashed(ctx: ModelContext) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).withTrashed();
    },

    onlyTrashed(ctx: ModelContext) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).onlyTrashed();
    },

    create(ctx: ModelContext, data: any) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).create(data);
    },

    insert(ctx: ModelContext, records: any[]) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName)).insert(records);
    },

    update(ctx: ModelContext, id: number | string, data: any) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName))
            .query(q => q.where(ctx.pk, id))
            .update(data);
    },

    delete(ctx: ModelContext, id: number | string) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName))
            .query(q => q.where(ctx.pk, id))
            .delete();
    },

    softDelete(ctx: ModelContext, id: number | string) {
        return createBuilder(ctx, ctx.getConnection()<Record<string, unknown>>(ctx.tableName))
            .query(q => q.where(ctx.pk, id))
            .softDelete();
    }
};
