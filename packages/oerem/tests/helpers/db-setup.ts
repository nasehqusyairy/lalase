import {
    createPool,
    type BelongsToManyColumn,
    type Model,
    type SoftDeleteColumn,
    type TimeStampColumns,
} from '../../src/index';
import { belongsTo, belongsToMany, hasMany } from '../../src/helper';
import type { Knex } from 'knex';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type IRoleRelations = {
    users?: BelongsToManyColumn<IUser, { user_id: number; role_id: number }>;
};

export type IRole = {
    id: number;
    name: string;
} & IRoleRelations;

export type IUserRelations = {
    posts?: IPost[];
    roles?: BelongsToManyColumn<IRole, { user_id: number; role_id: number }>;
};

export type IUser = {
    id: number;
    username: string;
    email: string;
    balance: number;
} & IUserRelations &
    TimeStampColumns &
    SoftDeleteColumn;

export type IPostRelations = {
    comments?: IComment[];
};

export type IPost = {
    id: number;
    user_id: number;
    title: string;
    status: string;
} & IPostRelations;

export type ICommentRelations = {
    user?: IUser;
};

export type IComment = {
    id: number;
    post_id: number;
    user_id: number;
    content: string;
} & ICommentRelations;

// ─── Test Context ─────────────────────────────────────────────────────────────

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

/**
 * Creates an isolated in-memory SQLite test database complete with schema and
 * model definitions. Call this once per test file inside `beforeAll` to get a
 * fully independent context with no shared state between test suites.
 */
export async function createTestDb() {
    const db = createPool({
        client: 'sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
    } as Knex.Config);

    // ── Model Definitions ───────────────────────────────────────────────────

    const Role = db.model<IRole, IRoleRelations>('roles', {
        fillable: ['name'],
        relations: {
            users: belongsToMany(() => User, 'role_user', 'role_id', 'user_id'),
        },
    });

    const User: Model<IUser, IUserRelations> = db.model('users', {
        fillable: ['username', 'email', 'balance'],
        softDelete: true,
        relations: {
            posts: hasMany(() => Post, 'user_id'),
            roles: belongsToMany(() => Role, 'role_user', 'user_id', 'role_id'),
        },
    });

    const Post = db.model<IPost, IPostRelations>('posts', {
        fillable: ['user_id', 'title', 'status'],
        relations: {
            comments: hasMany(() => Comment, 'post_id'),
        },
    });

    const Comment = db.model<IComment, ICommentRelations>('comments', {
        fillable: ['post_id', 'user_id', 'content'],
        relations: {
            user: belongsTo(() => User, 'user_id'),
        },
    });

    // ── Schema Setup ────────────────────────────────────────────────────────

    await db.getConnection().schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username');
        table.string('email');
        table.integer('balance').defaultTo(0);
        table.timestamps(true, true);
        table.datetime('deleted_at').nullable();
    });

    await db.getConnection().schema.createTable('roles', (table) => {
        table.increments('id');
        table.string('name');
        table.timestamps(true, true);
    });

    await db.getConnection().schema.createTable('role_user', (table) => {
        table.integer('user_id');
        table.integer('role_id');
    });

    await db.getConnection().schema.createTable('posts', (table) => {
        table.increments('id');
        table.integer('user_id').unsigned();
        table.string('title');
        table.string('status');
        table.timestamps(true, true);
    });

    await db.getConnection().schema.createTable('comments', (table) => {
        table.increments('id');
        table.integer('post_id').unsigned();
        table.integer('user_id').unsigned();
        table.text('content');
        table.timestamps(true, true);
    });

    return { db, User, Post, Comment, Role };
}
