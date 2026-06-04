import validationHandler from '@server/exception/handlers/validation-handler';
import defaultHandler from '@server/exception/handlers/default-handler';
import core from '../core/middleware';

export default {
    globalMiddlewares: [
        core.requestContextMiddleware,
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
        validationHandler,
        defaultHandler
    ],

    notFoundHandler: core.notFoundMiddleware
};