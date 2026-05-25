import express, {
    type Express,
    type Request,
    type Response,
    type NextFunction,
    type RequestHandler,
    type ErrorRequestHandler,
} from 'express';

import type { createServer as createViteServer } from 'vite';

declare global {
    namespace Express {
        interface Request {
            defineProperty<K extends keyof Request>(key: K, builder: PropertyBuilder<express.Request, K>): void;
            validate<T>(data: any, request: RequestDefinition): Promise<T>;
            vite: {
                tags(entries: string[]): Promise<string>;
                ssrRender(page: object): Promise<{ body: string }>;
            };
        }

        interface Response {
            defineProperty<K extends keyof Response>(key: K, builder: PropertyBuilder<express.Response, K>): void;

            inertia: {
                render(
                    component: string,
                    props?: Record<string, any>,
                    title?: string,
                ): Promise<any>;
                share(key: string, value: any): express.Response;
                shareAll(data: Record<string, any>): express.Response;
                location(url: string): express.Response;
                back(): express.Response;
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

export type ControllerActionArg = {
    req: Request;
    res: Response;
};

export type ControllerAction = (ctx: ControllerActionArg) => Promise<express.Response> | express.Response;

export type Controller = Record<string, ControllerAction>;

export type AppExtension = (app: Omit<Express, 'use'>) => void;

export type MiddlewareRegistry = {
    globalMiddlewares: Middleware[];
    apiMiddlewares: Middleware[];
    webMiddlewares: Middleware[];
    errorHandlers: ErrorHandler[];
    notFoundHandler: Middleware;
};

export type ErrorHandlerArg = {
    err: Error;
    req: Request;
    res: Response;
    next: NextFunction;
};

export type ErrorHandler = (ctx: ErrorHandlerArg) => Promise<void> | void;

export type ErrorHandlerTransformer = (errorHandler: ErrorHandler) => ErrorRequestHandler;

export type MiddlewareArg = {
    req: Request;
    res: Response;
    next: NextFunction;
};

export type Middleware = (ctx: MiddlewareArg) => void;

export type MiddlewareTransformer = (middleware: Middleware) => RequestHandler;

export type RequestDefinition = {
    authorize?: () => boolean | Promise<boolean>;
    schema: any;
};

export type PolicyArg<T, U> = {
    actor: T;
    data: U;
};

export type Policy<T, U> = (ctx: PolicyArg<T, U>) => boolean | Promise<boolean>;

export type ViteConfig = Parameters<typeof createViteServer>[0];

export type ViteOptions = {
    isProduction: boolean;
    manifest: string;
    config: ViteConfig;
};

export type PropertyBuilder<T, K> = (obj: T) => T[K];

export type SessionRecord = Record<string, any>;

declare module 'express-session' {
    interface SessionData extends SessionRecord { }
}

export type RouteMeta = {
    prefix: string;
    middleware: RequestHandler[];
    name?: string;
}