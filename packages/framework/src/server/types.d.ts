import express, {
    type Express,
    type Request,
    type Response,
    type NextFunction,
    type Application,
    type RequestHandler,
    type ErrorRequestHandler
} from 'express';

type SessionRecord = Record<string, any>;

export type Policy<T, U> = (ctx: { actor: T, data: U }) => boolean | Promise<boolean>;

export type MiddlewareArg = {
    req: Request;
    res: Response;
    next: NextFunction;
}

export type Middleware = (ctx: MiddlewareArg) => void;

export type ErrorHandler = (ctx: {
    err?: Error;
    req: Request;
    res: Response;
    next: NextFunction;
}) => void;

export type AppExtension = (app: Express) => void;

export type MiddlewareTransformer = (middleware: Middleware) => RequestHandler
export type ErrorHandlerTransformer = (errorHandler: ErrorHandler) => ErrorRequestHandler

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

export type PropertyBuilder<T> = (obj: T) => any

declare global {
    namespace Express {
        interface Response {
            defineProperty: (key: string, builder: PropertyBuilder<express.Response>) => void;
            inertia: {
                render: (
                    component: string,
                    props?: Record<string, any>,
                    title?: string
                ) => Promise<any>;
                share: (key: string, value: any) => Response;
                shareAll: (data: Record<string, any>) => Response;
                location: (url: string) => Response;
                back: () => Response;
            };
            flash: {
                errors?: Record<string, string[]>;
                old?: Record<string, any>;
                success?: string;
                message?: string;
            };
        }
        interface Request {
            defineProperty: (key: string, builder: PropertyBuilder<express.Request>) => void;
            validate<T>(data: any, request: RequestDefinition<T>): Promise<T>;

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
