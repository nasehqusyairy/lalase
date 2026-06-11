import type { Knex } from "knex";

/**
 * RelationHandler Class - OOP wrapper for relation handlers
 * Used by `.related()` method to manage related records
 */
export class RelationHandler {
    private readonly getConnection: () => Knex;
    private readonly parentId: any;
    private readonly relConfig: any;
    private readonly runner: Knex;

    constructor(getConnection: () => Knex, parentId: any, relConfig: any) {
        this.getConnection = getConnection;
        this.parentId = parentId;
        this.relConfig = relConfig;
        this.runner = getConnection();
    }

    /**
     * Create a new related record
     */
    async create(data: any) {
        const payload = this.relConfig._type !== "belongsToMany"
            ? { ...data, [this.relConfig.foreignKey]: this.parentId }
            : data;

        const ChildModel = this.relConfig.modelThunk();
        const newChild = await ChildModel.create(payload);

        if (this.relConfig._type === "belongsToMany") {
            const pk = ChildModel.tableName ? "id" : "id";
            await (this as any).attach(newChild[pk]);
        }

        return newChild;
    }

    /**
     * Insert multiple related records
     */
    async insert(records: any[]) {
        const relConfig = this.relConfig;
        const relType = relConfig._type;
        const parentId = this.parentId;
        const getConnection = this.getConnection;

        if (relType === "belongsToMany") {
            const results: any[] = [];
            for (const payload of records) {
                results.push(await (this as any).create(payload));
            }
            return results;
        }

        const ChildModel = relConfig.modelThunk();
        const payloads = records.map((data) => ({
            ...data,
            [relConfig.foreignKey]: parentId
        }));

        return await ChildModel.insert(payloads);
    }

    /**
     * Update related records
     */
    async update(idOrData: any, data?: any) {
        const isSingleUpdate = data !== undefined;
        const updateData = isSingleUpdate ? data : idOrData;
        const ChildModel = this.relConfig.modelThunk();
        const pk = "id";

        return await ChildModel.query((q: any) => {
            if (this.relConfig._type === "belongsToMany") {
                q.whereIn(
                    pk,
                    this.runner(this.relConfig.pivotTable)
                        .select(this.relConfig.relatedPivotKey)
                        .where(this.relConfig.foreignPivotKey, this.parentId)
                );
            } else {
                q.where(this.relConfig.foreignKey, this.parentId);
            }

            if (isSingleUpdate) {
                q.where(pk, idOrData);
            }
        }).update(updateData);
    }

    /**
     * Delete related records
     */
    async delete(id?: any) {
        const ChildModel = this.relConfig.modelThunk();
        const pk = "id";

        return await ChildModel.query((q: any) => {
            if (this.relConfig._type === "belongsToMany") {
                q.whereIn(
                    pk,
                    this.runner(this.relConfig.pivotTable)
                        .select(this.relConfig.relatedPivotKey)
                        .where(this.relConfig.foreignPivotKey, this.parentId)
                );
            } else {
                q.where(this.relConfig.foreignKey, this.parentId);
            }

            if (id) q.where(pk, id);
        }).delete();
    }

    /**
     * Soft delete related records
     */
    async softDelete(id?: any) {
        const ChildModel = this.relConfig.modelThunk();
        const pk = "id";

        return await ChildModel.query((q: any) => {
            if (this.relConfig._type === "belongsToMany") {
                q.whereIn(
                    pk,
                    this.runner(this.relConfig.pivotTable)
                        .select(this.relConfig.relatedPivotKey)
                        .where(this.relConfig.foreignPivotKey, this.parentId)
                );
            } else {
                q.where(this.relConfig.foreignKey, this.parentId);
            }

            if (id) q.where(pk, id);
        }).softDelete();
    }

    /**
     * Attach related records (belongsToMany)
     */
    async attach(ids: any | any[], extraPivotData = {}) {
        if (this.relConfig._type !== "belongsToMany") {
            throw new Error("attach is only available for belongsToMany relations");
        }

        const idArray = Array.isArray(ids) ? ids : [ids];
        const payload = idArray.map((id) => ({
            [this.relConfig.foreignPivotKey]: this.parentId,
            [this.relConfig.relatedPivotKey]: id,
            ...extraPivotData
        }));
        return await this.runner(this.relConfig.pivotTable).insert(payload);
    }

    /**
     * Detach related records (belongsToMany)
     */
    async detach(ids?: any | any[]) {
        if (this.relConfig._type !== "belongsToMany") {
            throw new Error("detach is only available for belongsToMany relations");
        }

        const q = this.runner(this.relConfig.pivotTable).where(this.relConfig.foreignPivotKey, this.parentId);
        if (ids) q.whereIn(this.relConfig.relatedPivotKey, Array.isArray(ids) ? ids : [ids]);
        return await q.del();
    }

    /**
     * Update pivot table record (belongsToMany)
     */
    async updatePivot(id: any, data: any) {
        if (this.relConfig._type !== "belongsToMany") {
            throw new Error("updatePivot is only available for belongsToMany relations");
        }

        return await this.runner(this.relConfig.pivotTable)
            .where(this.relConfig.foreignPivotKey, this.parentId)
            .where(this.relConfig.relatedPivotKey, id)
            .update(data);
    }

    /**
     * Sync related records (belongsToMany) - detach all and attach new set
     */
    async sync(ids: any[]) {
        if (this.relConfig._type !== "belongsToMany") {
            throw new Error("sync is only available for belongsToMany relations");
        }

        await this.detach();
        return await this.attach(ids);
    }
}

/**
 * Factory function to create RelationHandler instances (backward compatible)
 * @deprecated Use RelationHandler class directly
 */
export const createRelationHandler = (getConnection: () => Knex, parentId: any, relConfig: any) => {
    return new RelationHandler(getConnection, parentId, relConfig);
};

export type { RelationConfig, BelongsToMany, ModelOptions } from "./types";
