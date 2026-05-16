import { type Request, type Response, type NextFunction, type Application, type RequestHandler, type ErrorRequestHandler } from 'express';

type SessionRecord = Record<string, any>;

/**
 * Custom Middleware type with object destructuring parameter
 */
export type Middleware = (ctx: {
    app: Application;
    req: Request;
    res: Response;
    next: NextFunction;
}) => void;

export type ErrorHandler = (ctx: {
    err?: Error;
    app: Application;
    req: Request;
    res: Response;
    next: NextFunction;
}) => void;

export type MiddlewareTransformer = (middleware: Middleware, app: Application) => RequestHandler
export type ErrorHandlerTransformer = (errorHandler: ErrorHandler, app: Application) => ErrorRequestHandler

export type ViteManifestEntry = {
    file: string;
    src?: string;
    isEntry?: boolean;
    isDynamicEntry?: boolean;
    imports?: string[];
    dynamicImports?: string[];
    css?: string[];
}

export type ViteManifest = Record<string, ViteManifestEntry>;

declare global {
    namespace Express {
        interface Response {
            inertia: {
                render: (
                    component: string,
                    props?: Record<string, any>,
                    title?: string
                ) => Promise<any>;
                share: (key: string, value: any) => Response;
                shareAll: (data: Record<string, any>) => Response;
                location: (url: string) => Response;
            };
            flash: {
                errors?: Record<string, string[]>;
                old?: Record<string, any>;
                success?: string;
                message?: string;
            };
        }
        interface Request {
            validate<T>(request: RequestDefinition<T>): Promise<T>;
            all: () => Record<string, any>
            input: <T>(key: string, defaultValue?: T) => T | undefined
            param: <T>(key: string, defaultValue?: T) => T | undefined

            vite: {
                /**
                 * Mengembalikan HTML tags (<script>, <link>) untuk entry points yang diberikan.
                 *
                 * Dev        → transformIndexHtml dari ViteDevServer (HMR client otomatis)
                 * Production → resolve dari dist/client/.vite/manifest.json secara rekursif
                 */
                tags(entries: string[]): Promise<string>;

                /**
                 * Menjalankan SSR render untuk page object Inertia.
                 * Mengembalikan { body: string } — HTML hasil render React di server.
                 *
                 * Dev        → ssrLoadModule dari ViteDevServer (live transform)
                 * Production → import pre-built dist/ssr/entry-server.js
                 */
                ssrRender(page: object): Promise<{ body: string }>;
            };
        }
    }
}

declare module 'express-session' {
    interface SessionData extends SessionRecord { }
}

export type RequestDefinition<T> = {
    authorize?: () => boolean | Promise<boolean>;
    schema: any;
};
export type ControllerAction = (ctx: { req: Request, res: Response }) => Promise<void> | void;
export type Controller = Record<string, ControllerAction>;

export type MiddlewareConfig = {
    globalMiddlewares: Middleware[];
    apiMiddlewares: Middleware[];
    webMiddlewares: Middleware[];
    errorHandlers: ErrorHandler[];
    notFoundHandler: Middleware;
};
