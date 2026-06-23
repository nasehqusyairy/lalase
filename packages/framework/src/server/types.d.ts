import type { errors as vineErrors } from '@vinejs/vine';
import type { ValidationMessages } from '@vinejs/vine/types';
import express, {
    type Express,
    type Request,
    type Response,
    type NextFunction,
    type RequestHandler,
    type ErrorRequestHandler,
} from 'express';

import { createServer as createViteServer } from 'vite';

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
    request: Request;
    response: Response;
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
    request: Request;
    response: Response;
    next: NextFunction;
};

export type ErrorHandler = (ctx: ErrorHandlerArg) => void;

export type MiddlewareArg = {
    request: Request;
    response: Response;
    next: NextFunction;
};

export type Middleware = (ctx: MiddlewareArg) => void;

export type PolicyArg<T, U> = {
    actor: T;
    data: U;
};

export type Policy<T, U> = (ctx: PolicyArg<T, U>) => boolean | Promise<boolean>;

export type ViteConfig = Parameters<typeof createViteServer>[0];

export type ViteOptions = {
    debug: boolean;
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

export type VineValidationError = Omit<InstanceType<typeof vineErrors.E_VALIDATION_ERROR>, 'messages'> & { messages: ValidationMessages[] };
