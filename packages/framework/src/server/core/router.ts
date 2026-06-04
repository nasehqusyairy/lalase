import {
    Router,
    type NextFunction,
    type Request,
    type RequestHandler,
    type Response
} from 'express';
import type {
    ControllerAction,
    Middleware,
    RouteMeta
} from '@server/types';

export class RouteDefinition {
    private middlewares: RequestHandler[] = [];
    private routeName?: string;

    constructor(
        private router: Router,
        private method: 'get' | 'post',
        private path: string,
        private handler: RequestHandler,
        initialMeta: RouteMeta
    ) {
        this.middlewares = [...initialMeta.middleware];
        this.routeName = initialMeta.name;

        queueMicrotask(() => {
            this.registerToExpress();
        });
    }

    middleware(...middleware: Middleware[]) {
        const expressMiddleware = middleware.map(m =>
            ((req, res, next) => m({ req, res, next })) as RequestHandler
        );
        this.middlewares.push(...expressMiddleware);
        return this;
    }

    name(name: string) {
        this.routeName = name;
        return this;
    }

    private registerToExpress() {
        this.router[this.method](
            this.path,
            ...this.middlewares,
            this.handler
        );
    }
}

export class RouteBuilder {
    private router: Router;
    private contextStack: RouteMeta[] = [];

    private pendingMeta: RouteMeta = {
        prefix: '',
        middleware: []
    };

    constructor() {
        this.router = Router();
    }

    private handler(action: ControllerAction) {
        return (req: Request, res: Response, next: NextFunction) => {
            try {
                return action({ req, res });
            } catch (err) {
                next(err);
            }
        };
    }

    private currentMeta(): RouteMeta {
        return [...this.contextStack, this.pendingMeta].reduce<RouteMeta>(
            (acc, meta) => ({
                prefix: acc.prefix + meta.prefix,
                middleware: [...acc.middleware, ...meta.middleware],
                name: meta.name ?? acc.name
            }),
            { prefix: '', middleware: [] }
        );
    }

    private resetPending() {
        this.pendingMeta = { prefix: '', middleware: [] };
    }

    get(path: string, action: ControllerAction) {
        const meta = this.currentMeta();
        const fullPath = meta.prefix + path;

        const routeDefinition = new RouteDefinition(
            this.router,
            'get',
            fullPath,
            this.handler(action),
            meta
        );

        this.resetPending();
        return routeDefinition;
    }

    post(path: string, action: ControllerAction) {
        const meta = this.currentMeta();
        const fullPath = meta.prefix + path;

        const routeDefinition = new RouteDefinition(
            this.router,
            'post',
            fullPath,
            this.handler(action),
            meta
        );

        this.resetPending();
        return routeDefinition;
    }

    prefix(prefix: string) {
        this.pendingMeta.prefix += prefix;
        return this;
    }

    middleware(...middleware: Middleware[]) {
        this.pendingMeta.middleware.push(
            ...middleware.map(m => ((req, res, next) => m({ req, res, next })) as RequestHandler)
        );
        return this;
    }

    name(name: string) {
        this.pendingMeta.name = name;
        return this;
    }

    group(cb: () => void) {
        this.contextStack.push({ ...this.pendingMeta });
        this.resetPending();

        cb();

        this.contextStack.pop();
        return this;
    }

    getRouter(): Router {
        return this.router;
    }
}