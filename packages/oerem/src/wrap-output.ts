import type { Knex } from "knex";
import type { ModelOptions, RelationConfig } from "./types";
import type { Wrapper } from "./types";
import { createRelationHandler } from "./relation-handler";



/**
 * Bungkus output hasil query agar setiap row memiliki method `.related()`.
 */
export function wrapOutput(
    results: any[],
    options: Partial<ModelOptions<any>>,
    getConnection: () => Knex
) {
    results.forEach((item: any) => {
        Object.defineProperty(item, "related", {
            enumerable: false,
            value: async function (actions: Record<string, (h: any) => Promise<any>>) {
                const relResults: Record<string, any> = {};
                const pk = options.primaryKey || "id";
                const parentId = this[pk];

                for (const [relName, callback] of Object.entries(actions)) {
                    const relConfig = (options.relations as Record<string, RelationConfig>)?.[relName];
                    if (!relConfig) throw new Error(`Relation ${relName} not found`);

                    const handler = createRelationHandler(getConnection, parentId, relConfig);
                    relResults[relName] = await callback(handler);
                }

                return relResults;
            }
        });
    });
}



