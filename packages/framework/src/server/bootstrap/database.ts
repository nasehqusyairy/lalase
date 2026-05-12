import { createPool } from '@lalase/oerem';
import type { Knex } from 'knex';
import {
    DB_CONNECTION,
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB_NAME
} from '@server/config/database';

export const db = createPool({
    client: DB_CONNECTION,
    connection: {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_NAME
    }
} as Knex.Config);
