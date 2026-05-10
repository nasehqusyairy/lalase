import { type Request, type Response, type NextFunction } from 'express';
import 'express-session';
import { ZodType } from 'zod';

/**
 * Custom Middleware type with object destructuring parameter
 */
export type Middleware = (ctx: {
    err?: Error;
    req: Request;
    res: Response;
    next: NextFunction;
}) => void;

declare global {
    namespace Express {
        interface Response {
            view: (
                component: string,
                props?: Record<string, any>,
                title?: string
            ) => Promise<any>;
        }
        interface Request {
            validate<T>(request: RequestDefinition<T>): Promise<T>;
            all: () => Record<string, any>
            input: <T>(key: string, defaultValue?: T) => T | undefined
            param: <T>(key: string, defaultValue?: T) => T | undefined
        }
    }
}

declare module 'express-session' {
    interface SessionData {
        errors?: Record<string, string[]>;
        old?: Record<string, any>;
    }
}

export { };

export type RequestDefinition<T> = {
    authorize?: () => boolean | Promise<boolean>;
    schema: ZodType<T>;
};
export type ControllerAction = (ctx: { req: Request, res: Response }) => Promise<void> | void;
export type Controller = Record<string, ControllerAction>;
