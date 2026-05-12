import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Knex Native Features Compatibility', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();

        // Seed a base user required by multiple tests in this suite
        await ctx.User.create({ username: 'ghozali', email: 'ghozali@test.com' });
    });

    afterAll(async () => {
        await ctx.db().destroy();
    });

    // ── Field Aliasing ───────────────────────────────────────────────────────

    it('should support field aliasing using an "as" string', async () => {
        const results = await ctx.User.query((q) =>
            q.select('username as nama_lengkap', 'email as surel').where('username', 'ghozali')
        ).get<{ nama_lengkap: string; surel: string }>();

        const row = results[0];
        expect(row.nama_lengkap).toBe('ghozali');
        expect(row.surel).toBe('ghozali@test.com');
        expect((row as any).username).toBeUndefined();
    });

    it('should support field aliasing using an object mapping', async () => {
        const results = await ctx.User.query((q) =>
            q.select({ display_name: 'username', contact: 'email' }).where('username', 'ghozali')
        ).get<{ display_name: string; contact: string }>();

        const row = results[0];
        expect(row.display_name).toBe('ghozali');
        expect(row.contact).toBe('ghozali@test.com');
    });

    // ── Raw Expressions ──────────────────────────────────────────────────────

    it('should support knex.raw() for complex column expressions', async () => {
        const results = await ctx.User.query((q) =>
            q.select('username', ctx.db().raw('LENGTH(username) as name_length'))
                .where('username', 'ghozali')
        ).get();

        const row = results[0] as any;
        expect(row.username).toBe('ghozali');
        expect(Number(row.name_length)).toBe(7);
    });

    it('should support whereRaw() with bound parameters', async () => {
        const results = await ctx.User.query((q) =>
            q.whereRaw('LOWER(username) = ?', ['ghozali']).orderBy('id', 'desc')
        ).get();

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].username.toLowerCase()).toBe('ghozali');
    });

    // ── Filtering ────────────────────────────────────────────────────────────

    it('should allow chaining multiple where conditions', async () => {
        await ctx.User.create({ username: 'ghozali', email: 'ghozali2@test.com' });

        const results = await ctx.User.query((q) =>
            q.where('email', 'ghozali2@test.com').where('username', 'ghozali')
        ).get();

        expect(results.length).toBe(1);
        expect(results[0].email).toBe('ghozali2@test.com');
    });

    it('should support .distinct() to de-duplicate rows', async () => {
        await ctx.User.create({ username: 'duplicate', email: 'a@test.com' });
        await ctx.User.create({ username: 'duplicate', email: 'b@test.com' });

        const results = await ctx.User.query((q) =>
            q.distinct('username').where('username', 'duplicate')
        ).get();

        expect(results.length).toBe(1);
        expect(results[0].username).toBe('duplicate');
    });

    // ── Pagination ───────────────────────────────────────────────────────────

    it('should support orderBy, limit, and offset for cursor-style pagination', async () => {
        await ctx.User.create({ username: 'user_a', email: 'ua@test.com' });
        await ctx.User.create({ username: 'user_b', email: 'ub@test.com' });
        await ctx.User.create({ username: 'user_c', email: 'uc@test.com' });

        const results = await ctx.User.query((q) =>
            q.whereLike('username', 'user_%').orderBy('username', 'asc').limit(2).offset(1)
        ).get();

        // Sorted: user_a, user_b, user_c — offset 1, limit 2 → user_b, user_c
        expect(results.length).toBe(2);
        expect(results[0].username).toBe('user_b');
        expect(results[1].username).toBe('user_c');
    });

    // ── Aggregates ───────────────────────────────────────────────────────────

    it('should support groupBy and having to filter aggregated groups', async () => {
        await ctx.User.create({ username: 'group_a', email: '1@test.com' });
        await ctx.User.create({ username: 'group_a', email: '2@test.com' });
        await ctx.User.create({ username: 'group_b', email: '3@test.com' });

        const results = await ctx.User.query((q) =>
            q.select('username')
                .count('id as total')
                .groupBy('username')
                .having('total', '>', 1)
                .whereLike('username', 'group_%')
        ).get<{ username: string; total: number }>();

        expect(results.length).toBe(1);
        expect(results[0].username).toBe('group_a');
        expect(Number(results[0].total)).toBe(2);
    });

    it('should support max(), min(), and avg() aggregate functions', async () => {
        const results = await ctx.User.query((q) =>
            q.max('id as max_id').min('id as min_id').avg('id as avg_id')
        ).get<{ max_id: number; min_id: number; avg_id: number }>();

        const stats = results[0];
        expect(stats.max_id).toBeGreaterThan(0);
        expect(stats.min_id).toBeGreaterThan(0);
        expect(Number(stats.avg_id)).toBeTypeOf('number');
    });

    it('should support having() with a raw expression', async () => {
        const results = await ctx.User.query((q) =>
            q.select('username')
                .groupBy('username')
                .having(ctx.db().raw('COUNT(id)'), '>', 0)
        ).get();

        expect(results.length).toBeGreaterThan(0);
    });

    it('should support count() with an object alias', async () => {
        const results = await ctx.User.query((q) =>
            q.count({ total_users: 'id' })
        ).get<{ total_users: number }>();

        expect(Number(results[0].total_users)).toBeGreaterThan(0);
    });

    it('should support sum() aggregate function', async () => {
        const results = await ctx.User.query((q) =>
            q.sum('id as total_id')
        ).get<{ total_id: number }>();

        expect(Number(results[0].total_id)).toBeGreaterThan(0);
    });
});
