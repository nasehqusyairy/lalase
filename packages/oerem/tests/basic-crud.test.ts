import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Basic CRUD Operations', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();
    });

    afterAll(async () => {
        await ctx.db().destroy();
    });

    it('should create a record with fillable fields and auto-timestamps', async () => {
        const user = await ctx.User.create({
            username: 'ghozali',
            email: 'ghozali@example.com',
        });

        expect(user.id).toBe(1);
        expect(user.username).toBe('ghozali');
        expect(user.created_at).toBeDefined();
    });

    it('should find a record by primary key', async () => {
        const user = await ctx.User.find(1);

        expect(user).toBeDefined();
        expect(user?.username).toBe('ghozali');
    });

    it('should update a record and refresh updated_at timestamp', async () => {
        const before = await ctx.User.find(1);

        // Wait so the timestamp differs by at least 1 second
        await new Promise((res) => setTimeout(res, 1000));

        await ctx.User.update(1, { username: 'ghozali_updated' });
        const after = await ctx.User.find(1);

        expect(after?.username).toBe('ghozali_updated');
        expect(after?.updated_at).not.toBe(before?.updated_at);
    });

    it('should update multiple records matching a query condition', async () => {
        await ctx.User.query((q) => q.where('username', 'ghozali_updated')).update({ balance: 500 });

        const results = await ctx.User.query((q) => q.where('balance', 500)).get();

        expect(results).toHaveLength(1);
        expect(results[0].username).toBe('ghozali_updated');
    });

    it('should support complex query chaining with .with() and .query()', async () => {
        await ctx.User.create({ username: 'kafa', email: 'kafa@example.com' });

        const results = await ctx.User
            .with()
            .query((q) => q.where('username', 'like', '%kafa%').orderBy('id', 'desc'))
            .get();

        expect(results).toHaveLength(1);
        expect(results[0].username).toBe('kafa');
    });

    it('should soft-delete a record and exclude it from subsequent queries', async () => {
        // At this point: id=1 (ghozali_updated), id=2 (kafa)
        await ctx.User.softDelete(2);

        const visible = await ctx.User.all();
        const raw = await ctx.db().table('users').where('id', 2).first();

        expect(visible).toHaveLength(1);
        expect(visible[0].username).toBe('ghozali_updated');
        expect(raw).toBeDefined();
        expect(raw.deleted_at).not.toBeNull();
    });

    it('should throw when soft delete is called on a model with softDelete disabled', async () => {
        const StrictModel = ctx.createModel('other_table', { softDelete: false });

        await expect(StrictModel.softDelete(1)).rejects.toThrow('Soft delete disabled');
    });
});
