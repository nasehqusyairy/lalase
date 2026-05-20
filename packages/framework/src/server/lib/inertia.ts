import type { Request, Response } from 'express';
import { APP_VERSION } from '@server/config/constants';

/**
 * Inertia Class - Handle all Inertia.js logic
 *
 * Methods:
 *   - resolveProp: Lazy evaluation — eksekusi jika value adalah function
 *   - resolveProps: Resolve semua props dengan lazy evaluation
 *   - getMergedProps: Merge props dengan shared data, flash data, + partial reload support
 *   - render: Render Inertia page
 *   - share: Share global data aman per-request
 *   - shareAll: Share beberapa global data sekaligus
 *   - location: Location redirect (hard redirect untuk Inertia)
 *   - back: Redirect ke referer
 */
export class Inertia {
    /**
     * Lazy evaluation — eksekusi jika value adalah function
     */
    public resolveProp(value: unknown): unknown {
        return typeof value === 'function' ? value() : value;
    }

    /**
     * Resolve semua props dengan lazy evaluation
     */
    public resolveProps(props: Record<string, unknown>): Record<string, unknown> {
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
            resolved[key] = this.resolveProp(value);
        }
        return resolved;
    }

    /**
     * Merge props dengan shared data, flash data, + partial reload support.
     * Dipanggil lazy saat render() agar shared data yang di-set setelah inisialisasi
     * extension (misal oleh middleware auth) tetap ikut terbawa.
     */
    public getMergedProps(
        localProps: Record<string, unknown>,
        req: Request,
        res: Response
    ): Record<string, unknown> {
        // Pastikan inertiaSharedData sudah ada (bisa di-set oleh share/shareAll atau middleware lain)
        const sharedData: Record<string, unknown> = res.locals.inertiaSharedData || {};

        // Ambil data flash yang sudah diekstrak oleh Flash Middleware sebelumnya
        const flash = res.locals.flash || { errors: {}, old: {}, success: null, message: null };

        // Susun baseData dari global shared data
        const baseData: Record<string, unknown> = {
            ...this.resolveProps(sharedData),
        };

        // Inject errors dan flash ke data dasar Inertia secara otomatis
        baseData.errors = flash.errors;
        baseData.flash = {
            success: flash.success,
            message: flash.message,
        };

        // Handle Partial Reload: X-Inertia-Partial-Data
        const partialData = req.headers['x-inertia-partial-data'] as string | undefined;
        const isPartialReload = req.headers['x-inertia-partial'] === 'true';

        if (isPartialReload && partialData) {
            const requestedProps = partialData.split(',').map((s: string) => s.trim());
            const filtered: Record<string, unknown> = {};

            for (const key of requestedProps) {
                if (localProps[key] !== undefined) {
                    filtered[key] = this.resolveProp(localProps[key]);
                }
                if (baseData[key] !== undefined) {
                    filtered[key] = this.resolveProp(baseData[key]);
                }
            }

            // PENTING: Di Inertia, 'errors' harus SELALU dikirim walaupun tidak diminta di partial reload
            // Ini agar komponen form client-side tidak kehilangan state error saat berinteraksi.
            filtered.errors = baseData.errors;

            return filtered;
        }

        // Gabungkan baseData (shared + flash) dengan local props dari Controller
        return { ...baseData, ...this.resolveProps(localProps) };
    }

    /**
         * Render Inertia page
         */
    public async render(
        component: string,
        props: Record<string, unknown>,
        req: Request,
        res: Response
    ): Promise<Response> {
        if (!req) {
            throw new Error('Request object not available');
        }

        // Pastikan inertiaSharedData terinisialisasi (guard jika middleware tidak jalan)
        res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};

        const url = req.originalUrl;
        const mergedProps = this.getMergedProps(props ?? {}, req, res);

        const page = {
            component,
            props: mergedProps,
            url,
            version: APP_VERSION,
        };

        // Inertia AJAX request — kembalikan JSON
        if (req.headers['x-inertia']) {
            res.setHeader('X-Inertia', 'true');
            res.setHeader('Vary', 'Accept');
            res.setHeader('X-Inertia-Version', APP_VERSION);
            return res.json(page);
        }

        // SSR: Pre-render React components on server via vite-middleware
        let appHtml = '';
        try {
            appHtml = (await req.vite.ssrRender(page)).body;
        } catch (err) {
            console.error('SSR Error:', err);
            appHtml = '';
        }

        const head = await req.vite.tags(['src/client/entry-client.tsx']);

        res.render('app', {
            _inertia: {
                head,
                body: appHtml,
            },
        });
        return res;
    }

    /**
     * Share global data aman per-request
     */
    public share(key: string, value: unknown, res: Response): Response {
        res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
        res.locals.inertiaSharedData[key] = value;
        return res;
    }

    /**
     * Share beberapa global data sekaligus
     */
    public shareAll(data: Record<string, unknown>, res: Response): Response {
        res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
        Object.assign(res.locals.inertiaSharedData, data);
        return res;
    }

    /**
     * Location redirect (hard redirect untuk Inertia)
     */
    public location(url: string, req: Request, res: Response): Response {
        if (!req) {
            throw new Error('Request object not available');
        }

        if (!req.headers['x-inertia']) {
            res.redirect(url);
            return res;
        }

        res.status(409);
        res.setHeader('X-Inertia-Location', url);
        res.json({ error: 'Inertia location redirect', status: 409 });
        return res;
    }

    /**
     * Redirect ke referer
     */
    public back(req: Request, res: Response): Response {
        if (!req) {
            throw new Error('Request object not available');
        }

        // Ambil URL asal dari header Referer, jika tidak ada fallback ke halaman utama '/'
        const fallbackUrl = req.headers['referer'] || req.headers['referrer'] || '/';

        // Pastikan URL yang diambil adalah path lokal (menghindari open redirect vulnerability)
        let redirectUrl = '/';
        try {
            // Jika referer berupa full URL (http://localhost:3000/users/create), ambil path-nya saja
            const parsedUrl = new URL(fallbackUrl as string, `${req.protocol}://${req.headers.host}`);
            redirectUrl = parsedUrl.pathname + parsedUrl.search;
        } catch {
            // Jika parsing gagal, gunakan string mentah jika dimulai dengan '/'
            if (typeof fallbackUrl === 'string' && fallbackUrl.startsWith('/')) {
                redirectUrl = fallbackUrl;
            }
        }

        // Set status ke 303 (See Other)
        res.status(303);
        res.redirect(redirectUrl);
        return res;
    }
}
