import type { MiddlewareRegistry } from '@server/types';
import defaultHandler from '@server/error-handlers/default-handler';
import inertiaValidationHandler from '@server/error-handlers/inertia-validation-handler';
import core from '@server/middlewares/core-middleware';

export default {
    globalMiddlewares: [
        core.staticMiddleware,
        core.jsonParserMiddleware,
        core.urlencodedParserMiddleware,
        core.multipartParserMiddleware,
    ],

    apiMiddlewares: [],

    webMiddlewares: [
        core.serveMiddleware,
        core.sessionMiddleware,
        core.flashMiddleware,
        core.inertiaMiddleware,
        core.redirectMiddleware,
    ],

    errorHandlers: [
        inertiaValidationHandler,
        defaultHandler
    ],

    notFoundHandler: core.notFoundMiddleware

} as MiddlewareRegistry;
