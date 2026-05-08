// tests/make-controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';
import { runCli } from '../src/cli';

// Mengarahkan semua pemanggilan fs ke memfs (Virtual FS)
vi.mock('node:fs', () => import('memfs').then(m => m.fs));
vi.mock('node:fs/promises', () => import('memfs').then(m => m.fs.promises));

describe('Lalase CLI - Make Controller', () => {
    beforeEach(() => {
        vol.reset();
        // Inisialisasi struktur folder virtual
        vol.mkdirSync(process.cwd(), { recursive: true });
        vol.mkdirSync('./src/server/controllers', { recursive: true });
    });

    it('seharusnya membuat file controller baru dengan template yang benar', async () => {
        // 1. Simulasi input: node lalase make:controller users
        const fakeArgs = ['make:controller', 'users'];

        // 2. Eksekusi
        await runCli(fakeArgs);

        // 3. Cek apakah file benar-benar ada di Virtual FS
        const controllerFiles = vol.readdirSync('./src/server/controllers');
        expect(controllerFiles.length).toBe(1);
        expect(controllerFiles[0]).toMatch(/-controller\.ts$/);

        // 4. Cek isi file
        const content = vol.readFileSync(`./src/server/controllers/${controllerFiles[0]}`, 'utf-8');
        expect(content).toContain('export default');
        expect(content).toContain('satisfies Controller');
        expect(content).toContain('async index');
        expect(content).toContain('async create');
    });

    it('seharusnya menampilkan error jika nama controller tidak disertakan', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

        await runCli(['make:controller']);

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Nama controller wajib diisi'));
        // Memastikan aplikasi berhenti dengan kode error
        expect(exitSpy).toHaveBeenCalledWith(1);

        errorSpy.mockRestore();
        exitSpy.mockRestore();
    });
});
