import { createPool } from 'oerem'

export const db = createPool({
    client: process.env.DB_CONNECTION || 'mysql2',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'lalase',
    }
});