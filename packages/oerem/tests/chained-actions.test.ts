import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Direct vs Chained Actions', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();
    });

    afterAll(async () => {
        await ctx.db().destroy();
    });

    it('should mass-update records matching a query without requiring an ID', async () => {
        await ctx.User.create({ username: 'kafa_1', email: 'kafa1@test.com' });
        await ctx.User.create({ username: 'kafa_2', email: 'kafa2@test.com' });

        const affectedRows = await ctx.User
            .query((q) => q.where('username', 'like', 'kafa_%'))
            .update({ email: 'massal@test.com' });

        expect(affectedRows).toBe(2);

        const updated = await ctx.User.query((q) => q.where('email', 'massal@test.com')).get();
        expect(updated).toHaveLength(2);
    });

    it('should hard-delete records matching a query condition', async () => {
        await ctx.User.create({ username: 'spam_user', email: 'spam@test.com' });

        await ctx.User.query((q) => q.where('username', 'spam_user')).delete();

        const ormCheck = await ctx.User.query((q) => q.where('username', 'spam_user')).get();
        expect(ormCheck).toHaveLength(0);

        const dbCheck = await ctx.db().table('users').where('username', 'spam_user').first();
        expect(dbCheck).toBeUndefined();
    });

    it('should soft-delete records via chaining and exclude them from subsequent reads', async () => {
        await ctx.User.create({ username: 'temp_user', email: 'temp@test.com' });

        await ctx.User.query((q) => q.where('username', 'temp_user')).softDelete();

        const visible = await ctx.User.all();
        expect(visible.some((u) => u.username === 'temp_user')).toBe(false);

        const raw = await ctx.db().table('users').where('username', 'temp_user').first();
        expect(raw.deleted_at).not.toBeNull();
    });

    it('should apply a direct Model.update(id, data) call without prior query filters', async () => {
        const user = await ctx.User.create({ username: 'direct_test', email: 'direct@test.com' });

        await ctx.User.update(user.id, { username: 'direct_ok' });

        const result = await ctx.User.find(user.id);
        expect(result?.username).toBe('direct_ok');
    });

    it('should hard-delete a specific record via Model.delete(id)', async () => {
        const user = await ctx.User.create({ username: 'to_delete', email: 'delete@test.com' });

        await ctx.User.delete(user.id);

        const result = await ctx.User.find(user.id);
        expect(result).toBeUndefined();
    });
});
