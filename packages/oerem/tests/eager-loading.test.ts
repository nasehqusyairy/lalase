import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { type InferModel } from '../src/index';
import { createTestDb, type TestDb } from './helpers/db-setup';

describe('Eager Loading (Relations)', () => {
    let ctx: TestDb;

    beforeAll(async () => {
        ctx = await createTestDb();

        // ── Seed relational data ─────────────────────────────────────────────
        const user1 = await ctx.User.create({ username: 'nasyikh' });
        const user2 = await ctx.User.create({ username: 'nobel' });

        await ctx.Post.insert([
            { user_id: user1.id, title: 'Post Pertama', status: 'published' },
            { user_id: user1.id, title: 'Post Kedua', status: 'draft' },
            { user_id: 99, title: 'Post Orang Lain', status: 'published' },
        ]);

        await ctx.Comment.insert([
            { post_id: 1, user_id: user1.id, content: 'Komentar untuk Post Pertama' },
            { post_id: 1, user_id: user2.id, content: 'Komentar kedua untuk Post Pertama' },
            { post_id: 2, user_id: user1.id, content: 'Komentar untuk Post Kedua' },
        ]);
    });

    afterAll(async () => {
        await ctx.db.close();
    });

    it('should load a simple hasMany relationship', async () => {
        const user = await ctx.User
            .query((q) => q.where('username', 'nasyikh'))
            .with('posts')
            .first();

        expect(user).toBeDefined();
        expect(user?.posts).toHaveLength(2);
        expect(user?.posts?.[0].title).toBe('Post Pertama');
    });

    it('should load deeply nested relationships (posts.comments.user)', async () => {
        const user = await ctx.User
            .query((q) => q.where('username', 'nasyikh'))
            .with('posts.comments.user')
            .first();

        expect(user?.posts).toHaveLength(2);

        const comments = user?.posts?.[0].comments;
        expect(comments).toBeDefined();
        expect(comments?.[0].content).toBe('Komentar untuk Post Pertama');
        expect(user?.posts?.[0].comments?.[1].user?.username).toBe('nobel');
    });

    it('should load relationships with nested query constraints', async () => {
        type MPost = InferModel<typeof ctx.Post>;
        type MComment = InferModel<typeof ctx.Comment>;

        const user = await ctx.User
            .query((q) => q.where('username', 'nasyikh'))
            .with({
                posts: (p: MPost['builder']) =>
                    p.query((q) => q.where('status', 'published')).with({
                        comments: (c: MComment['builder']) =>
                            c.query((q) => q.whereLike('content', '%kedua%')).with('user'),
                    }),
            })
            .first();

        expect(user?.posts).toHaveLength(1);
        expect(user?.posts?.[0].status).toBe('published');

        const comments = user?.posts?.[0].comments;
        expect(comments).toHaveLength(1);
        expect(comments?.[0].content).toBe('Komentar kedua untuk Post Pertama');
        expect(comments?.[0].user?.username).toBe('nobel');
    });

    it('should efficiently load multiple parent records with eager loading (Anti N+1)', async () => {
        const user2 = await ctx.User.create({ username: 'alqusyairy' });
        await ctx.Post.create({ user_id: user2.id, title: 'Post User 2', status: 'published' });

        const users = await ctx.User.with('posts.comments').get();

        const u1 = users.find((u) => u.username === 'nasyikh');
        const u2 = users.find((u) => u.username === 'alqusyairy');

        expect(u1?.posts).toHaveLength(2);
        expect(u2?.posts).toHaveLength(1);
    });

    it('should return an empty array for a relation with no matching records', async () => {
        const loneUser = await ctx.User.create({ username: 'lonely' });

        const user = await ctx.User
            .query((q) => q.where('id', loneUser.id))
            .with('posts')
            .first();

        expect(user?.posts).toEqual([]);
    });

    it('should attach, detach, and create many-to-many records via .related()', async () => {
        const adminRole = await ctx.Role.create({ name: 'admin' });
        const editorRole = await ctx.Role.create({ name: 'editor' });
        await ctx.Role.create({ name: 'viewer' });
        const user = await ctx.User.create({ username: 'm2m_test' });

        // Attach two roles
        await user.related({
            roles: async (r) => {
                await r.attach([adminRole.id, editorRole.id]);
            },
        });

        const after_attach = await ctx.User
            .query((q) => q.where('id', user.id))
            .with('roles')
            .first();

        expect(after_attach?.roles).toHaveLength(2);

        const firstRole = after_attach?.roles?.[0] as any;
        expect(firstRole.pivot).toBeDefined();
        expect(firstRole.pivot.user_id).toBe(user.id);

        // Detach admin, create and attach super_admin in one block
        await (after_attach as any).related({
            roles: async (r: any) => {
                await r.detach(adminRole.id);
                await r.create({ name: 'super_admin' });
            },
        });

        const final = await ctx.User
            .query((q) => q.where('id', user.id))
            .with('roles')
            .first();

        const roleNames = final?.roles?.map((r: any) => r.name);
        expect(roleNames).not.toContain('admin');
        expect(roleNames).toContain('editor');
        expect(roleNames).toContain('super_admin');
        expect(final?.roles).toHaveLength(2);
    });

    it('should not expose the .related() method when the model is serialized to JSON', async () => {
        const user = await ctx.User
            .query((q) => q.where('username', 'm2m_test'))
            .with('roles')
            .first();

        const parsed = JSON.parse(JSON.stringify(user));
        expect(parsed.related).toBeUndefined();
    });
});
