import { createPool } from '@lalase/oerem';
import type { Knex } from 'knex';
import {
    DB_CLIENT,
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB_NAME
} from '@server/config/db';

export const { createModel, getConnection: db, transaction } = createPool({
    client: DB_CLIENT,
    connection: {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_NAME
    }
} as Knex.Config);