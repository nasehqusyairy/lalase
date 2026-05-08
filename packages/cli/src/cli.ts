import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import migrationTemplate from './templates/migration.ts';
import controllerTemplate from './templates/controller.ts';

export async function runCli(args?: string[]) {
    // Use args directly if provided (for testing), otherwise use process.argv
    const commandArgs = args !== undefined
        ? args
        : process.argv.slice(2);

    if (commandArgs.length === 0) {
        console.error('Error: Nama migrasi wajib diisi');
        process.exit(1);
    }

    const command = commandArgs[0];

    if (command === 'make:migration') {
        const migrationName = commandArgs[1];

        if (!migrationName) {
            console.error('Error: Nama migrasi wajib diisi');
            process.exit(1);
        }

        await makeMigration(migrationName);
    } else if (command === 'make:controller') {
        const controllerName = commandArgs[1];

        if (!controllerName) {
            console.error('Error: Nama controller wajib diisi');
            process.exit(1);
        }

        await makeController(controllerName);
    } else {
        console.error(`Error: Unknown command "${command}"`);
        process.exit(1);
    }
}

async function makeMigration(name: string) {
    // Generate timestamp
    const timestamp = Date.now();
    const fileName = `${timestamp}_${name}.ts`;
    const migrationsDir = path.join(process.cwd(), 'src/server/database/migrations');

    // Create migrations directory if it doesn't exist
    if (!existsSync(migrationsDir)) {
        mkdirSync(migrationsDir, { recursive: true });
    }

    const filePath = path.join(migrationsDir, fileName);

    // Keep table_name as placeholder in comments for user reference
    const content = migrationTemplate;

    writeFileSync(filePath, content, 'utf-8');

    console.log(`Migration created: ${fileName}`);
}

async function makeController(name: string) {
    const fileName = `${name}-controller.ts`;
    const controllersDir = path.join(process.cwd(), 'src/server/controllers');

    // Create controllers directory if it doesn't exist
    if (!existsSync(controllersDir)) {
        mkdirSync(controllersDir, { recursive: true });
    }

    const filePath = path.join(controllersDir, fileName);

    // Replace {name} placeholder with actual controller name
    const content = controllerTemplate.replace(/\{name\}/g, name);

    writeFileSync(filePath, content, 'utf-8');

    console.log(`Controller created: ${fileName}`);
}

// Only run automatically when executed directly (not imported)
const isMain = import.meta.url.endsWith(process.argv[1]?.replace(/[/\\]/g, '/'));
if (isMain) {
    runCli().catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}
