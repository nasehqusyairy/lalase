import { Router, type RequestHandler } from 'express';
import { handler } from './handler';
import type { ControllerAction } from '../types';

type Middleware = RequestHandler | string;

interface RouteMeta {
    prefix: string;
    middleware: Middleware[];
    name?: string;
}

class RouteBuilder {
    private router: Router;
    private contextStack: RouteMeta[] = [];

    private pendingMeta: RouteMeta = {
        prefix: '',
        middleware: []
    };

    constructor() {
        this.router = Router();
    }

    /* =====================
     * Internal
     * ===================== */
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

    /* =====================
     * Route methods
     * ===================== */
    get(path: string, action: ControllerAction) {
        const meta = this.currentMeta();

        this.router.get(
            meta.prefix + path,
            ...meta.middleware.filter(m => typeof m === 'function'),
            handler(action)
        );

        this.resetPending();
        return this;
    }

    post(path: string, action: ControllerAction) {
        const meta = this.currentMeta();

        this.router.post(
            meta.prefix + path,
            ...meta.middleware.filter(m => typeof m === 'function'),
            handler(action)
        );

        this.resetPending();
        return this;
    }

    /* =====================
     * Fluent config
     * ===================== */
    prefix(prefix: string) {
        this.pendingMeta.prefix += prefix;
        return this;
    }

    middleware(middleware: Middleware | Middleware[]) {
        this.pendingMeta.middleware.push(
            ...(Array.isArray(middleware) ? middleware : [middleware])
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

    /* =====================
     * Export
     * ===================== */
    getRouter(): Router {
        return this.router;
    }
}

/**
 * Create a new RouteBuilder instance
 * Each route file should call this to get its own router
 */
export function createRoute(): RouteBuilder {
    return new RouteBuilder();
}

// Default route instance for backward compatibility
export const Route = new RouteBuilder();
