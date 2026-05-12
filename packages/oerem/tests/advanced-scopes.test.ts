import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Advanced Scopes & Batch Operations', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();
    });

    afterAll(async () => {
        await ctx.db().destroy();
    });

    it('should perform batch insert with fillable filtering and auto-timestamps', async () => {
        await ctx.User.insert([
            { username: 'user1_a', email: 'a@test.com' },
            { username: 'user2_b', email: 'b@test.com' },
        ]);

        const results = await ctx.User.query((q) =>
            q.whereIn('username', ['user1_a', 'user2_b'])
        ).get();

        expect(results).toHaveLength(2);
        expect(results[0].created_at).toBeDefined();
    });

    it('should include soft-deleted records when using withTrashed()', async () => {
        const user = await ctx.User.create({ username: 'ghost', email: 'ghost@test.com' });
        await ctx.User.softDelete(user.id);

        const regular = await ctx.User.query((q) => q.where('username', 'ghost')).get();
        expect(regular).toHaveLength(0);

        const withDeleted = await ctx.User
            .withTrashed()
            .query((q) => q.where('username', 'ghost'))
            .get();
        expect(withDeleted).toHaveLength(1);
    });

    it('should return only soft-deleted records when using onlyTrashed()', async () => {
        // 'ghost' from the previous test is still soft-deleted in this DB
        const onlyDeleted = await ctx.User.onlyTrashed().get();

        expect(onlyDeleted.length).toBeGreaterThan(0);
        expect(onlyDeleted.every((u) => u.deleted_at !== null)).toBe(true);
    });
});
