import express, { type Request, type Response, type NextFunction } from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { web } from '@server/routes/web';
import multer from 'multer'
import { deepTrim } from '@server/core/request';
import { fileURLToPath, pathToFileURL } from 'url';
import session from 'express-session';
import { AuthorizationError, HttpError, ValidationError } from '@server/core/error';
import { RequestDefinition } from '@server/types';
import { castValue } from '@shared/helpers';

const PRODUCTION = process.env.APP_ENV === 'production';
const PORT = process.env.PORT || 5173;
const APP_NAME = process.env.APP_NAME || 'react-monolith';
const APP_SECRET = process.env.APP_SECRET || 'secret-key';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

// Helper untuk mendeteksi apakah kita berjalan dari folder 'dist' atau root
const IS_DIST = __dirname.endsWith('dist');
const ROOT_PATH = IS_DIST ? path.join(__dirname, '..') : __dirname;

function runtimePath(...segments: string[]) {
    // Jika di production, file views/client biasanya ada di folder dist
    return path.join(ROOT_PATH, ...segments);
}

async function startServer() {
    const app = express();

    app.use(session({
        secret: APP_SECRET,
        resave: false,
        saveUninitialized: false,
    }));

    let vite: ViteDevServer | undefined;
    if (!PRODUCTION) {
        // DEVELOPMENT: Vite Middleware
        vite = await createViteServer({
            server: {
                middlewareMode: true,
                hmr: { port: 24678 }
            },
            appType: 'custom'
        });

        app.use(vite.middlewares);

    } else {
        // PRODUCTION: static client build
        app.use(express.static(path.join(__dirname, 'client')));
    }

    // View engine
    app.set('view engine', 'ejs');
    app.set(
        'views',
        runtimePath('views')
    );


    // Middleware: renderProps
    app.use((req: Request, res: Response, next: NextFunction) => {
        res.renderProps = async (component: string, props: any, title = APP_NAME) => {
            try {
                if (req.headers['x-custom-navigation']) {
                    return res.json({ component, props });
                }

                const url = req.originalUrl;
                let htmlRender;

                if (!PRODUCTION && vite) {
                    // =========================
                    // DEV (Vite middleware)
                    // =========================
                    const { render } = await vite.ssrLoadModule('/src/client/entry-server.tsx');

                    const { html } = await render({ component, props });

                    const viteHead = await vite.transformIndexHtml(url, '');

                    htmlRender = {
                        appHtml: html,
                        viteHead,
                    };
                } else {
                    // =========================
                    // PROD (built server bundle)
                    // =========================
                    const entryPath = pathToFileURL(
                        runtimePath('ssr/entry-server.js')
                    ).href;

                    const { render } = await import(entryPath);

                    const { html } = await render({ component, props });

                    // 1. Baca file index.html hasil build
                    const template = readFileSync(runtimePath('client/index.html'), 'utf-8');

                    // 2. Ambil Asset Links (Script & CSS) dari template
                    // Kita bisa gunakan regex sederhana atau membagi string-nya
                    const headAssets = template.match(/<head>([\s\S]*?)<\/head>/)?.[1] || '';
                    const bodyAssets = template.match(/<body>([\s\S]*?)<\/body>/)?.[1]
                        || '';

                    // 3. Bersihkan Assets dari placeholder SSR jika ada
                    const viteHead = headAssets.replace('<title>Vite App</title>', '');
                    const scripts = bodyAssets.replace('<div id="root"></div>', '');

                    // Asset sudah ditangani oleh index.html / EJS
                    htmlRender = {
                        appHtml: html,
                        viteHead: viteHead + scripts,
                    };
                }


                res.render('app', {
                    appHtml: htmlRender.appHtml,
                    props,
                    component,
                    title,
                    viteHead: htmlRender.viteHead
                });
            } catch (e: any) {
                // Jika error saat render, lempar ke error handler
                if (!PRODUCTION && vite) vite.ssrFixStacktrace(e);
                next(e);
            }
        };
        next();
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(multer().any());

    app.use((req: Request, res: Response, next: NextFunction) => {

        req.all = () => {
            return deepTrim({
                ...req.query,
                ...req.body,
                ...(req.files ? { files: req.files } : {}),
            })
        };

        const input = req.all()

        // 2. Fungsi req.input<T>(key, default)
        req.input = <T>(key: string, defaultValue?: T): T | undefined => {

            const value = input[key];
            return castValue(value, defaultValue);
        };

        // 3. Fungsi req.route<T>(key, default)
        req.param = <T>(key: string, defaultValue?: T): T | undefined => {
            const value = req.params[key];
            return castValue(value, defaultValue);
        };

        req.validate = async function <T>({ authorize, schema }: RequestDefinition<T>) {
            /* ========================
             * Authorization
             * ======================== */
            if (authorize) {
                const allowed = await authorize();
                if (!allowed) {
                    throw new AuthorizationError();
                }
            }
            /* ========================
             * Validation
             * ======================== */
            const result = await schema.safeParseAsync(input);

            if (!result.success) {
                throw new ValidationError(
                    result.error.flatten().fieldErrors as Record<string, string[]>,
                    input
                );
            }

            /* ========================
             * Typed & Sanitized
             * ======================== */
            return result.data;
        };

        next();
    });


    app.use((req, res, next) => {
        res.locals.errors = req.session.errors || {};
        res.locals.old = req.session.old || {};

        delete req.session.errors;
        delete req.session.old;

        next();
    });


    // Routes
    app.use(web);

    // --- ERROR HANDLING ---

    // 1. Handle 404
    app.use((req, res) => {
        res.status(404).render('error', {
            message: 'Halaman tidak ditemukan'
        });
    });

    // 2. Uncaught Error Handler (500)
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        // console.error('SERVER ERROR:', err.stack);

        if (res.headersSent) {
            return next(err);
        }

        /* ========================
         * Known Http Errors
         * ======================== */
        if (err instanceof HttpError) {
            // Validation
            if (err instanceof ValidationError) {
                return res.status(err.status).json({
                    message: err.message,
                    errors: err.errors,
                });
            }

            // Other HTTP errors (403, 404, etc)
            return res.status(err.status).json({
                message: err.message,
            });
        }

        /* ========================
         * Unknown Error
         * ======================== */
        console.error('SERVER ERROR:', err);

        // Production / no stack
        if (PRODUCTION || !err.stack) {
            return res.status(500).render('error', {
                message: 'Terjadi kesalahan pada server',
            });
        }

        /* ========================
         * Dev Debug Info
         * ======================== */
        const match = err.stack.match(
            /at .*?\(?(?:file:\/\/)?(\/.*?):(\d+):(\d+)\)?/
        );

        let filePath = '';
        let lineNumber = 0;
        let fileContent = '';

        if (match) {
            filePath = match[1];
            lineNumber = Number(match[2]);

            try {
                fileContent = readFileSync(filePath, 'utf-8');
            } catch {
                fileContent = 'Tidak dapat membaca file sumber.';
            }
        }

        return res.status(500).render('error', {
            message: err.message,
            filePath,
            lineNumber,
            fileContent,
        });
    });
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
}

// Global Rejection Handler (Mencegah aplikasi crash tanpa log)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();