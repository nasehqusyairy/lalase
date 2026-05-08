// tests/make-migration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';
import { runCli } from '../src/cli';

// Mengarahkan semua pemanggilan fs ke memfs (Virtual FS)
vi.mock('node:fs', () => import('memfs').then(m => m.fs));
vi.mock('node:fs/promises', () => import('memfs').then(m => m.fs.promises));

describe('Lalase CLI - Make Migration', () => {
    beforeEach(() => {
        vol.reset();
        // Inisialisasi struktur folder virtual
        vol.mkdirSync(process.cwd(), { recursive: true });
        vol.mkdirSync('./src/server/database/migrations', { recursive: true });
    });

    it('seharusnya membuat file migrasi baru dengan template yang benar', async () => {
        // 1. Simulasi input: node lalase make:migration create_users
        const fakeArgs = ['make:migration', 'create_users'];

        // 2. Eksekusi
        await runCli(fakeArgs);

        // 3. Cek apakah file benar-benar ada di Virtual FS
        const migrationFiles = vol.readdirSync('./src/server/database/migrations');
        expect(migrationFiles.length).toBe(1);
        expect(migrationFiles[0]).toMatch(/_create_users\.ts$/);

        // 4. Cek isi file
        const content = vol.readFileSync(`./src/server/database/migrations/${migrationFiles[0]}`, 'utf-8');
        expect(content).toContain('export async function up()');
        expect(content).toContain('export async function down()');
        expect(content).toContain('createTable(\'table_name\'');
    });

    it('seharusnya menampilkan error jika nama migrasi tidak disertakan', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

        await runCli(['make:migration']);

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Nama migrasi wajib diisi'));
        // Memastikan aplikasi berhenti dengan kode error
        expect(exitSpy).toHaveBeenCalledWith(1);

        errorSpy.mockRestore();
        exitSpy.mockRestore();
    });
});