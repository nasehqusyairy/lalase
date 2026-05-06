import type { Knex } from "knex";

/**
 * Buat handler untuk relasi yang dipakai oleh `.related({ ... })`.
 */
export const createRelationHandler = (getConnection: () => Knex, parentId: any, relConfig: any) => {
    const runner = getConnection();
    const ChildModel = relConfig.modelThunk();
    const pk = ChildModel.primaryKey || "id";

    const baseMethods = {
        async create(data: any) {
            const payload = relConfig._type !== "belongsToMany"
                ? { ...data, [relConfig.foreignKey]: parentId }
                : data;

            const newChild = await ChildModel.create(payload);



            if (relConfig._type === "belongsToMany") {
                await (this as any).attach(newChild[pk]);
            }

            return newChild;
        },

        async insert(records: any[]) {
            const payloads = records.map((data) =>
                relConfig._type !== "belongsToMany"
                    ? { ...data, [relConfig.foreignKey]: parentId }
                    : data
            );

            if (relConfig._type === "belongsToMany") {
                const results: any[] = [];
                for (const payload of payloads) {
                    results.push(await this.create(payload));
                }
                return results;
            }

            return await ChildModel.insert(payloads);
        },

        async update(idOrData: any, data?: any) {
            const isSingleUpdate = data !== undefined;
            const updateData = isSingleUpdate ? data : idOrData;

            return await ChildModel.query((q: any) => {
                if (relConfig._type === "belongsToMany") {
                    q.whereIn(
                        pk,
                        runner(relConfig.pivotTable)
                            .select(relConfig.relatedPivotKey)
                            .where(relConfig.foreignPivotKey, parentId)
                    );
                } else {
                    q.where(relConfig.foreignKey, parentId);
                }

                if (isSingleUpdate) {
                    q.where(pk, idOrData);
                }
            }).update(updateData);
        },

        async delete(id?: any) {
            return await ChildModel.query((q: any) => {
                if (relConfig._type === "belongsToMany") {
                    q.whereIn(
                        pk,
                        runner(relConfig.pivotTable)
                            .select(relConfig.relatedPivotKey)
                            .where(relConfig.foreignPivotKey, parentId)
                    );
                } else {
                    q.where(relConfig.foreignKey, parentId);
                }

                if (id) q.where(pk, id);
            }).delete();
        },

        async softDelete(id?: any) {
            return await ChildModel.query((q: any) => {
                if (relConfig._type === "belongsToMany") {
                    q.whereIn(
                        pk,
                        runner(relConfig.pivotTable)
                            .select(relConfig.relatedPivotKey)
                            .where(relConfig.foreignPivotKey, parentId)
                    );
                } else {
                    q.where(relConfig.foreignKey, parentId);
                }

                if (id) q.where(pk, id);
            }).softDelete();
        }
    };

    if (relConfig._type === "belongsToMany") {
        return {
            ...baseMethods,
            async attach(ids: any | any[], extraPivotData = {}) {
                const idArray = Array.isArray(ids) ? ids : [ids];
                const payload = idArray.map((id) => ({
                    [relConfig.foreignPivotKey]: parentId,
                    [relConfig.relatedPivotKey]: id,
                    ...extraPivotData
                }));
                return await runner(relConfig.pivotTable).insert(payload);
            },

            async detach(ids?: any | any[]) {
                const q = runner(relConfig.pivotTable).where(relConfig.foreignPivotKey, parentId);
                if (ids) q.whereIn(relConfig.relatedPivotKey, Array.isArray(ids) ? ids : [ids]);
                return await q.del();
            },

            async updatePivot(id: any, data: any) {
                return await runner(relConfig.pivotTable)
                    .where(relConfig.foreignPivotKey, parentId)
                    .where(relConfig.relatedPivotKey, id)
                    .update(data);
            },

            async sync(ids: any[]) {
                await this.detach();
                return await this.attach(ids);
            }
        };
    }

    return baseMethods;
};

export type { RelationConfig, BelongsToMany, ModelOptions } from "./types";




