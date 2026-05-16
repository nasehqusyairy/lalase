import type { ViteManifest } from '@server/types';
import fs from 'fs';
import type { ViteDevServer } from 'vite';

export function readViteManifest(manifestPath: string) {
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Vite manifest not found at: ${manifestPath}. Did you run "vite build"?`);
    }

    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ViteManifest;
}

export function generateAssetTag(file: string) {
    if (file.endsWith('.css')) {
        return `<link rel="stylesheet" href="/${file}">`;
    }

    if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
        return `<script type="module" src="/${file}"></script>`;
    }

    return '';
}

export function resolveViteTags(entries: string[], manifest: ViteManifest) {
    const tags: string[] = [];
    const seen = new Set<string>();

    function processEntry(src: string): void {
        const chunk = manifest[src];
        if (!chunk) return;

        // CSS dari chunk ini
        chunk.css?.forEach((cssFile) => {
            if (!seen.has(cssFile)) {
                seen.add(cssFile);
                tags.push(`<link rel="stylesheet" href="/${cssFile}">`);
            }
        });

        // Static imports rekursif (bukan dynamic — dynamic dibiarkan lazy)
        chunk.imports?.forEach((imported) => {
            if (!seen.has(imported)) {
                seen.add(imported);
                processEntry(imported);
            }
        });

        // File utama chunk
        if (!seen.has(chunk.file)) {
            seen.add(chunk.file);
            tags.push(generateAssetTag(chunk.file));
        }
    }

    entries.forEach(processEntry);

    return tags.join('\n');
}

export async function resolveViteDevTags(url: string, entries: string[], vite: ViteDevServer) {

    return vite.transformIndexHtml(
        url,
        entries
            .map((e) => `<script type="module" src="/${e}"></script>`)
            .join('\n')
    );
}