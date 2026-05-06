import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Transactions', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();
    });

    afterAll(async () => {
        await ctx.db.close();
    });

    it('should commit all changes when a transaction completes successfully', async () => {
        await ctx.db.transaction(async () => {
            await ctx.db.getConnection().table('users').insert({
                username: 'alice',
                balance: 100,
            });
        });

        const user = await ctx.db.getConnection().table('users').where('username', 'alice').first();
        expect(user).toBeDefined();
        expect(user.balance).toBe(100);
    });

    it('should work with Oerem Model factories inside a transaction', async () => {
        await ctx.db.transaction(async () => {
            await ctx.User.create({ username: 'charlie', balance: 200 });
        });

        const charlie = await ctx.db.getConnection().table('users').where('username', 'charlie').first();
        expect(charlie.balance).toBe(200);
    });

    it('should rollback all changes if any operation within the transaction throws', async () => {
        try {
            await ctx.db.transaction(async () => {
                await ctx.User.create({ username: 'dave', balance: 300 });
                await ctx.db.getConnection().table('users').insert({ username: 'bob', balance: 500 });

                throw new Error('Forced rollback');
            });
        } catch {
            // Expected — transaction rolls back on error
        }

        const dave = await ctx.db.getConnection().table('users').where('username', 'dave').first();
        const bob = await ctx.db.getConnection().table('users').where('username', 'bob').first();

        expect(dave).toBeUndefined();
        expect(bob).toBeUndefined();
    });
});
