import type { MiddlewareConfig } from '@server/types';
import defaultHandler from '@server/error-handlers/default-handler';
import sessionMiddleware from '@server/middlewares/session-middleware';
import flashMiddleware from '@server/middlewares/flash-middleware';
import inertiaMiddleware from '@server/middlewares/inertia-middleware';
import redirectMiddleware from '@server/middlewares/redirect-middleware';
import serveMiddleware from '@server/middlewares/serve-middleware';
import notFoundMiddleware from '@server/middlewares/not-found-middleware';
import requestMiddleware from '@server/middlewares/request-middleware';
import jsonParserMiddleware from '@server/middlewares/json-parser-middleware';
import urlencodedParserMiddleware from '@server/middlewares/urlencoded-parser-middleware';
import multipartParserMiddleware from '@server/middlewares/multipart-parser-middleware';
import viteMiddleware from '@server/middlewares/vite-middleware';
import edgeMiddleware from '@server/middlewares/edge-middleware';
import viewpathMiddleware from '@server/middlewares/viewpath-middleware';
import staticMiddleware from '@server/middlewares/static-middleware';
import inertiaValidationHandler from '@server/error-handlers/inertia-validation-handler';

export default {
    globalMiddlewares: [
        staticMiddleware,
        requestMiddleware,
        jsonParserMiddleware,
        urlencodedParserMiddleware,
        multipartParserMiddleware,
    ],

    apiMiddlewares: [

    ],

    webMiddlewares: [
        serveMiddleware,
        viteMiddleware,
        sessionMiddleware,
        viewpathMiddleware,
        edgeMiddleware,
        flashMiddleware,
        inertiaMiddleware,
        redirectMiddleware,
    ],

    errorHandlers: [
        inertiaValidationHandler,
        defaultHandler
    ],

    notFoundHandler: notFoundMiddleware

} as MiddlewareConfig;