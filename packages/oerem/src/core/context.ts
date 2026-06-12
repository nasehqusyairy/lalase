import type { Knex } from "knex";

/**
 * Context Interface - A lightweight context object containing model-specific data
 * This is passed to shared methods to enable them to work with any model
 */
export interface ModelContext {
    tableName: string;
    options: Record<string, unknown>;
    getConnection: () => Knex;
    pk: string;
    deletedAt: string;
}
