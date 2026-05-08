import type { Knex } from "knex";
import { executeGet } from "./executor";
import { wrapOutput } from "./wrap-output";
import type { Builder, SoftDeleteMode, WithInput, Wrapper } from "./types";
import { applySecurity, controlOutput } from "./helper";
import type { SelectBuilder } from "./select-builder";
import type { ModelContext } from "./context";

/**
 * Shared Builder Creation
 * Creates fresh state per query (withRelations, currentQuery, softDeleteMode)
 * but uses the shared ModelContext to avoid recreating method logic
 */
export const createBuilder = (
    ctx: ModelContext,
    queryInstance: Knex.QueryBuilder<Record<string, unknown>, unknown[]>
): Builder<Record<string, unknown>, Record<string, unknown>> => {
    let withRelations: (WithInput<Record<string, unknown>> | string)[] = [];
    let currentQuery = queryInstance;
    let softDeleteMode: SoftDeleteMode = 'active';

    return {
        withTrashed() {
            softDeleteMode = 'with';
            return this;
        },

        onlyTrashed() {
            softDeleteMode = 'only';
            return this;
        },

        with(...args: (WithInput<Record<string, unknown>> | string)[]) {
            withRelations.push(...args);
            return this;
        },

        query(callback: (q: SelectBuilder<Record<string, unknown>>) => SelectBuilder<Record<string, unknown>>) {
            callback(currentQuery as unknown as SelectBuilder<Record<string, unknown>>);
            return this;
        },

        toSQL() {
            return currentQuery.toSQL();
        },

        async get<R = Record<string, unknown>>(): Promise<(R & Wrapper<Record<string, unknown>>)[]> {
            return await executeGet<R, Record<string, unknown>>(
                currentQuery,
                ctx.options as any,
                ctx.tableName,
                ctx.deletedAt,
                softDeleteMode,
                withRelations as WithInput[],
                ctx.getConnection
            ) as any;
        },

        async first<R = Record<string, unknown>>(): Promise<R | undefined> {
            if (ctx.options.softDelete) {
                currentQuery.whereNull(ctx.deletedAt);
            }
            const results = await this.get<R[]>();
            return controlOutput([results[0]], ctx.options as any)[0] as R | undefined;
        },

        async create(data: any): Promise<any> {
            const filtered = applySecurity(data, ctx.options as any);
            const payload = { ...filtered } as Record<string, unknown>;
            if (ctx.options.timestamps !== false) {
                const now = ctx.getConnection().fn.now();
                payload.created_at = payload.created_at || now;
                payload.updated_at = payload.updated_at || now;
            }
            const [insertedId] = await ctx.getConnection()(ctx.tableName).insert(payload);
            const pkKey = ctx.pk as keyof Record<string, unknown>;
            const results = [{ [pkKey]: (data as Record<string, unknown>)[pkKey] || insertedId, ...payload }];
            wrapOutput(results, ctx.options as any, ctx.getConnection);
            return results[0];
        },

        async update(data: any) {
            const filtered = applySecurity(data, ctx.options as any);
            const payload = { ...filtered } as Record<string, unknown>;
            if (ctx.options.timestamps !== false) {
                payload.updated_at = payload.updated_at || ctx.getConnection().fn.now();
            }
            return currentQuery.update(payload as never);
        },

        async insert(records: any[]): Promise<void> {
            const payloads = records.map(data => {
                const filtered = applySecurity(data, ctx.options as any);
                const payload = { ...filtered } as Record<string, unknown>;
                if (ctx.options.timestamps !== false) {
                    const now = ctx.getConnection().fn.now();
                    payload.created_at = payload.created_at || now;
                    payload.updated_at = payload.updated_at || now;
                }
                return payload;
            });
            await ctx.getConnection()(ctx.tableName).insert(payloads);
        },

        async delete() {
            return currentQuery.del() as any;
        },
        async softDelete() {
            if (!ctx.options.softDelete) throw new Error("Soft delete disabled");
            return currentQuery.update({ [ctx.deletedAt]: ctx.getConnection().fn.now() } as never) as any;
        }
    };
};
