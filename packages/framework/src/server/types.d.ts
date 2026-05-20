import express, {
    type Express,
    type Request,
    type Response,
    type NextFunction,
    type RequestHandler,
    type ErrorRequestHandler,
} from 'express';

import type { createServer as createViteServer } from 'vite';

// ---------------------------------------------------------------------------
// Express augmentation
// ---------------------------------------------------------------------------

declare global {
    namespace Express {
        interface Request {
            defineProperty: (key: string, builder: PropertyBuilder<express.Request>) => void;
            validate<T>(data: any, request: RequestDefinition<T>): Promise<T>;
            vite: {
                tags(entries: string[]): Promise<string>;
                ssrRender(page: object): Promise<{ body: string }>;
            };
        }

        interface Response {
            defineProperty: (key: string, builder: PropertyBuilder<express.Response>) => void;

            inertia: {
                render(
                    component: string,
                    props?: Record<string, any>,
                    title?: string,
                ): Promise<any>;
                share(key: string, value: any): Response;
                shareAll(data: Record<string, any>): Response;
                location(url: string): Response;
                back(): Response;
            };

            flash: {
                errors?: Record<string, string[]>;
                old?: Record<string, any>;
                success?: string;
                message?: string;
            };
        }
    }
}

// ---------------------------------------------------------------------------
// Vite
// ---------------------------------------------------------------------------

export type ViteManifestEntry = {
    file: string;
    src?: string;
    isEntry?: boolean;
    isDynamicEntry?: boolean;
    imports?: string[];
    dynamicImports?: string[];
    css?: string[];
};

export type ViteManifest = Record<string, ViteManifestEntry>;

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export type ControllerActionArg = {
    req: Request;
    res: Response;
};

export type ControllerAction = (ctx: ControllerActionArg) => Promise<void> | void;

export type Controller = Record<string, ControllerAction>;

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export type AppExtension = (app: Express) => void;

// ---------------------------------------------------------------------------
// Middleware config
// ---------------------------------------------------------------------------

export type MiddlewareConfig = {
    globalMiddlewares: Middleware[];
    apiMiddlewares: Middleware[];
    webMiddlewares: Middleware[];
    errorHandlers: ErrorHandler[];
    notFoundHandler: Middleware;
};

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export type ErrorHandlerArg = {
    err?: Error;
    req: Request;
    res: Response;
    next: NextFunction;
};

export type ErrorHandler = (ctx: ErrorHandlerArg) => void;

export type ErrorHandlerTransformer = (errorHandler: ErrorHandler) => ErrorRequestHandler;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export type MiddlewareArg = {
    req: Request;
    res: Response;
    next: NextFunction;
};

export type Middleware = (ctx: MiddlewareArg) => void;

export type MiddlewareTransformer = (middleware: Middleware) => RequestHandler;

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

export type RequestDefinition<T> = {
    authorize?: () => boolean | Promise<boolean>;
    schema: any;
};

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export type PolicyArg<T, U> = {
    actor: T;
    data: U;
};

export type Policy<T, U> = (ctx: PolicyArg<T, U>) => boolean | Promise<boolean>;

// ---------------------------------------------------------------------------
// Vite config
// ---------------------------------------------------------------------------

export type ViteConfig = Parameters<typeof createViteServer>[0];

export type ViteOptions = {
    isProduction: boolean;
    manifest: string;
    config: ViteConfig;
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export type PropertyBuilder<T> = (obj: T) => any;

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type SessionRecord = Record<string, any>;

declare module 'express-session' {
    interface SessionData extends SessionRecord { }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export type RouteMeta = {
    prefix: string;
    middleware: RequestHandler[];
    name?: string;
}