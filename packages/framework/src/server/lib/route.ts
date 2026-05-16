import {
    Router,
    type Application,
    type NextFunction,
    type Request,
    type RequestHandler,
    type Response
} from 'express';
import type { ControllerAction, Middleware } from '@server/types';
import { toRequestHandler } from '@server/helpers/middleware';

interface RouteMeta {
    prefix: string;
    middleware: RequestHandler[];
    name?: string;
}

export class RouteBuilder {
    private router: Router;
    private contextStack: RouteMeta[] = [];
    private app: Application;

    private pendingMeta: RouteMeta = {
        prefix: '',
        middleware: []
    };

    private handler(action: ControllerAction) {
        return (req: Request, res: Response, next: NextFunction) => {
            try {
                return action({ req, res });
            } catch (err) {
                next(err);
            }
        };
    }

    constructor(app: Application) {
        this.app = app
        this.router = Router();
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

        this.router.get(
            meta.prefix + path,
            ...meta.middleware.filter((m) => typeof m === 'function'),
            this.handler(action)
        );

        this.resetPending();
        return this;
    }

    post(path: string, action: ControllerAction) {
        const meta = this.currentMeta();

        this.router.post(
            meta.prefix + path,
            ...meta.middleware.filter((m) => typeof m === 'function'),
            this.handler(action)
        );

        this.resetPending();
        return this;
    }

    prefix(prefix: string) {
        this.pendingMeta.prefix += prefix;
        return this;
    }

    middleware(...middleware: Middleware[]) {
        this.pendingMeta.middleware.push(...middleware.map(m => toRequestHandler(m, this.app)));
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
