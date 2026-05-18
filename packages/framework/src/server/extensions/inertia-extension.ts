import { APP_VERSION } from '@server/config/app';
import type { AppExtension } from "@server/types";

/*
|-------------------------------------------------------------------------------------------
| Inertia Extension - Menambahkan inertia ke res
|
| Fungsi:
|   1. Menyediakan res.inertia.render() untuk render Inertia page
|   2. Menyediakan res.inertia.share() dan shareAll() untuk shared data
|   3. Menyediakan res.inertia.location() untuk hard redirect
|   4. Menyediakan res.inertia.back() untuk redirect ke referer
|-------------------------------------------------------------------------------------------
*/
export default ((app) => {
    app.response.defineProperty('inertia', function (res) {
        const req = res.req;
        // ---------------------------------------------------------------------------------
        // Helper: Lazy evaluation — eksekusi jika value adalah function
        // ---------------------------------------------------------------------------------
        const resolveProp = (value: any): any => {
            return typeof value === 'function' ? value() : value;
        };

        // ---------------------------------------------------------------------------------
        // Helper: Resolve semua props dengan lazy evaluation
        // ---------------------------------------------------------------------------------
        const resolveProps = (props: Record<string, any>): Record<string, any> => {
            const resolved: Record<string, any> = {};
            for (const [key, value] of Object.entries(props)) {
                resolved[key] = resolveProp(value);
            }
            return resolved;
        };

        // ---------------------------------------------------------------------------------
        // Helper: Merge props dengan shared data, flash data, + partial reload support.
        // Dipanggil lazy saat render() agar shared data yang di-set setelah inisialisasi
        // extension (misal oleh middleware auth) tetap ikut terbawa.
        // ---------------------------------------------------------------------------------
        const getMergedProps = (localProps: Record<string, any>, req: any): Record<string, any> => {
            // Pastikan inertiaSharedData sudah ada (bisa di-set oleh share/shareAll atau middleware lain)
            const sharedData: Record<string, any> = res.locals.inertiaSharedData || {};

            // Ambil data flash yang sudah diekstrak oleh Flash Middleware sebelumnya
            const flash = res.locals.flash || { errors: {}, old: {}, success: null, message: null };

            // Susun baseData dari global shared data
            const baseData: Record<string, any> = {
                ...resolveProps(sharedData),
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
                const filtered: Record<string, any> = {};

                for (const key of requestedProps) {
                    if (localProps[key] !== undefined) {
                        filtered[key] = resolveProp(localProps[key]);
                    }
                    if (baseData[key] !== undefined) {
                        filtered[key] = resolveProp(baseData[key]);
                    }
                }

                // PENTING: Di Inertia, 'errors' harus SELALU dikirim walaupun tidak diminta di partial reload
                // Ini agar komponen form client-side tidak kehilangan state error saat berinteraksi.
                filtered.errors = baseData.errors;

                return filtered;
            }

            // Gabungkan baseData (shared + flash) dengan local props dari Controller
            return { ...baseData, ...resolveProps(localProps) };
        };

        return {
            render: async (component: string, props: any) => {
                if (!req) {
                    throw new Error('Request object not available');
                }

                // Pastikan inertiaSharedData terinisialisasi (guard jika middleware tidak jalan)
                res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};

                const url = req.originalUrl;
                const mergedProps = getMergedProps(props ?? {}, req);

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

                res.render('app', {
                    _inertia: {
                        head: await req.vite.tags(['src/client/entry-client.tsx']),
                        body: appHtml,
                    }
                });
            },

            // Share global data aman per-request
            share: (key: string, value: any) => {
                res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
                res.locals.inertiaSharedData[key] = value;
                return res;
            },

            // Share beberapa global data sekaligus
            shareAll: (data: Record<string, any>) => {
                res.locals.inertiaSharedData = res.locals.inertiaSharedData || {};
                Object.assign(res.locals.inertiaSharedData, data);
                return res;
            },

            // Location redirect (hard redirect untuk Inertia)
            location: (url: string) => {
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
            },

            back: () => {
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
            },
        };
    });
}) as AppExtension;