import type { OeremConfig } from "@lalase/oerem";

export default {
    inputFolder: './src/server/models',
    outputFolder: './src/shared/types/models',
    migrationsFolder: './src/server/database/migrations',
    poolFile: './src/server/core/pool.ts',
} satisfies OeremConfig