import type { OeremConfig } from "@lalase/oerem";

export default {
    inputFolder: './src/server/models',
    knex: {
        client: 'mysql2',
        connection: {
            host: 'localhost',
            user: 'root',
            password: '',
            port: 3306,
            database: 'for_learn'
        }
    },
    outputFolder: './src/shared/types/models',
    migrationsFolder: './src/server/database/migrations',
    poolFile: './src/server/core/pool.ts',
} satisfies OeremConfig