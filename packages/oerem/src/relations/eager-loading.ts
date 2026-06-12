import type { Knex } from "knex";
import type { RelationConfig } from "../types/relations";
import type { ModelOptions } from "../types/models";
import type { SoftDeleteMode, WithInput } from "../types/models";
import { normalizeWith } from "../utils/normalizer";

/**
 * Jalankan eager loading (stitching) untuk `with()`.
 */
export async function applyEagerLoading<T extends Record<string, unknown>, U extends Record<string, unknown> = {}>(
    cleanResults: any[],
    options: Partial<ModelOptions<T, U>>,
    tableName: string,
    withRelations: WithInput<U>[],
    deletedAt: string,
    softDeleteMode: SoftDeleteMode,
    getConnection: () => Knex
) {
    if (!withRelations.length) return;

    const normalized = normalizeWith(...withRelations);

    for (const [relName, callback] of Object.entries(normalized)) {
        const relConfig = options.relations?.[relName as string] as RelationConfig | undefined;
        if (!relConfig) {
            throw new Error(`Oerem Error: Relation [${relName}] not defined in model [${tableName}].`);
        }

        const ChildModel = relConfig.modelThunk();

        const isBelongsToMany = relConfig._type === "belongsToMany";
        const isBelongsTo = relConfig._type === "belongsTo";

        const parentKey = isBelongsToMany
            ? (relConfig.localKey || "id")
            : (isBelongsTo ? relConfig.foreignKey : (relConfig.localKey || "id"));

        const parentIds = [...new Set(cleanResults.map((p: any) => p[parentKey]))].filter(Boolean);

        if (parentIds.length === 0) {
            cleanResults.forEach((p: any) => {
                p[relName] = (relConfig._type === "hasMany" || relConfig._type === "belongsToMany") ? [] : null;
            });
            continue;
        }

        const childKey = isBelongsTo ? (relConfig.localKey || "id") : relConfig.foreignKey;

        let childBuilder: any;
        if (isBelongsToMany) {
            childBuilder = ChildModel.query((q: any) => {
                q.join(
                    relConfig.pivotTable!,
                    `${ChildModel.tableName}.${relConfig.foreignKey || "id"}`,
                    "=",
                    `${relConfig.pivotTable}.${relConfig.relatedPivotKey}`
                );

                q.select(`${ChildModel.tableName}.*`);
                q.select(`${relConfig.pivotTable}.*`);
                q.select(`${relConfig.pivotTable}.${relConfig.foreignPivotKey} as _pivot_parent_id`);
                q.whereIn(`${relConfig.pivotTable}.${relConfig.foreignPivotKey}`, parentIds);
                return q;
            });
        } else {
            childBuilder = ChildModel.query((q: any) => {
                q.whereIn(childKey, parentIds);
                return q;
            });
        }

        if (callback) {
            childBuilder = callback(childBuilder);
        }

        const childResults = await childBuilder.get();

        cleanResults.forEach((parent: any) => {
            const pVal = parent[parentKey];

            if (relConfig._type === "belongsToMany") {
                const matchingChildren = childResults.filter((c: any) => c._pivot_parent_id === pVal);

                parent[relName] = matchingChildren.map((c: any) => {
                    const childClone = { ...c };
                    childClone.pivot = {
                        [relConfig.foreignPivotKey!]: c[relConfig.foreignPivotKey!],
                        [relConfig.relatedPivotKey!]: c[relConfig.relatedPivotKey!]
                    };
                    delete childClone._pivot_parent_id;
                    return childClone;
                });
            } else if (relConfig._type === "hasMany") {
                parent[relName] = childResults.filter((c: any) => c[childKey] === pVal);
            } else {
                parent[relName] = childResults.find((c: any) => c[childKey] === pVal) || null;
            }
        });
    }
}
