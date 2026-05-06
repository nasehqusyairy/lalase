import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Security & Auditor Constraints', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();
    });

    afterAll(async () => {
        await ctx.db.close();
    });

    // ── Illegal Operation Detection ──────────────────────────────────────────

    it('should reject .first() smuggled inside a .get() chain', async () => {
        const illegalQuery = ctx.User.query((q) => (q as any).first());

        await expect(illegalQuery.get())
            .rejects
            .toThrow("Oerem: 'first' is not allowed in 'get' query. Use 'find' or 'first' method instead.");
    });

    it('should reject .insert() smuggled inside a .get() chain and not persist data', async () => {
        const illegalQuery = ctx.User.query((q) =>
            (q as any).insert({ username: 'hacker', email: 'hacker@test.com' })
        );

        await expect(illegalQuery.get())
            .rejects
            .toThrow('Oerem: Illegal write operation detected in a read query!');

        const dbCheck = await ctx.db.getConnection().table('users').where('username', 'hacker').first();
        expect(dbCheck).toBeUndefined();
    });

    it('should reject .delete() smuggled inside a .get() chain and not remove data', async () => {
        await ctx.User.create({ username: 'victim', email: 'victim@test.com' });

        const illegalDelete = ctx.User.query((q) =>
            (q as any).del().where('username', 'victim')
        );

        await expect(illegalDelete.get())
            .rejects
            .toThrow('Oerem: Illegal write operation detected in a read query!');

        const victim = await ctx.User.query((q) => q.where('username', 'victim')).get();
        expect(victim).toHaveLength(1);
    });

    it('should reject .update() smuggled inside a .get() chain and not mutate data', async () => {
        await ctx.User.create({ username: 'safe_user', email: 'safe@test.com' });

        const illegalUpdate = ctx.User.query((q) =>
            (q as any).update({ username: 'pwned' }).where('username', 'safe_user')
        );

        await expect(illegalUpdate.get())
            .rejects
            .toThrow('Oerem: Illegal write operation detected in a read query!');

        const user = await ctx.User.query((q) => q.where('email', 'safe@test.com')).first();
        expect(user?.username).not.toBe('pwned');
    });

    it('should allow normal select queries without auditor interference', async () => {
        await ctx.User.create({ username: 'normal_user', email: 'normal@test.com' });

        const results = await ctx.User.query((q) => q.where('id', '>', 0)).get();

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
    });

    // ── Lazy Execution ───────────────────────────────────────────────────────

    it('should not execute SQL until .get() is called', async () => {
        await ctx.User.create({ username: 'lazy_user', email: 'lazy@test.com' });

        let queryExecuted = false;
        let capturedSql = '';

        const tracker = (obj: any) => {
            queryExecuted = true;
            capturedSql = obj.sql;
        };

        ctx.db.getConnection().on('query', tracker);

        const pending = ctx.User.query((q) => q.where('username', 'lazy_user'));
        expect(queryExecuted, 'No SQL should be sent before .get() is called').toBe(false);

        await pending.get();
        expect(queryExecuted, 'SQL should be sent when .get() is called').toBe(true);
        expect(capturedSql).toContain('select');
        expect(capturedSql).toContain('`username` = ?');

        ctx.db.getConnection().removeListener('query', tracker);
    });

    it('should intercept an illegal query before it reaches the database', async () => {
        let sqlSentToDb = false;
        const tracker = () => { sqlSentToDb = true; };

        ctx.db.getConnection().on('query', tracker);

        const illegalUpdate = ctx.User.query((q) => (q as any).update({ username: 'hacker' }));

        try {
            await illegalUpdate.get();
        } catch {
            // Expected error — auditor blocks before await
        }

        expect(sqlSentToDb, 'Illegal SQL must not reach the database').toBe(false);
        ctx.db.getConnection().removeListener('query', tracker);
    });

    // ── Field Visibility & Guards ────────────────────────────────────────────

    it('should strip fields listed in the hidden option from query results', async () => {
        const SecretUser = ctx.db.model<any>('users', {
            fillable: ['username', 'email'],
            hidden: ['email'],
        });

        await SecretUser.create({ username: 'topsecret', email: 'secret@test.com' });

        const user = await SecretUser.query((q) => q.where('username', 'topsecret')).first();

        expect(user?.username).toBe('topsecret');
        expect((user as any).email).toBeUndefined();
    });

    it('should block create and update when a guarded field is present in the payload', async () => {
        const GuardedUser = ctx.db.model<any>('users', {
            guarded: ['balance'],
            fillable: ['username', 'balance'],
        });

        await expect(
            GuardedUser.create({ username: 'normal', balance: 1000 })
        ).rejects.toThrow(/Cannot write to guarded field/);

        const user = await GuardedUser.create({ username: 'valid_user' });
        expect(user.username).toBe('valid_user');

        await expect(
            GuardedUser.update(user.id, { balance: 2000 })
        ).rejects.toThrow(/Cannot write to guarded field/);
    });

    it('should throw when a field outside the fillable list is passed to create()', async () => {
        const RestrictedUser = ctx.db.model<any>('users', { fillable: ['username'] });

        await expect(
            RestrictedUser.create({ username: 'ali', email: 'ali@test.com' })
        ).rejects.toThrow(/not in fillable list/);
    });
});
