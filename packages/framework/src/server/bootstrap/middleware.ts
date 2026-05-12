import type { MiddlewareConfig } from '@server/types';
import defaultHandler from '@server/error-handlers/core/default-handler';
import sessionMiddleware from '@server/middlewares/core/session-middleware';
import flashMiddleware from '@server/middlewares/core/flash-middleware';
import viewMiddleware from '@server/middlewares/core/view-middleware';
import serveMiddleware from '@server/middlewares/core/serve-middleware';
import notFoundMiddleware from '@server/middlewares/core/not-found-middleware';
import requestMiddleware from '@server/middlewares/core/request-middleware';
import jsonParserMiddleware from '@server/middlewares/core/json-parser-middleware';
import urlencodedParserMiddleware from '@server/middlewares/core/urlencoded-parser-middleware';
import multipartParserMiddleware from '@server/middlewares/core/multipart-parser-middleware';

export default {
    globalMiddlewares: [

    ],

    apiMiddlewares: [

    ],

    webMiddlewares: [
        sessionMiddleware,
        jsonParserMiddleware,
        urlencodedParserMiddleware,
        multipartParserMiddleware,
        requestMiddleware,
        flashMiddleware,
        viewMiddleware,
        serveMiddleware
    ],

    errorHandlers: [
        defaultHandler
    ],

    notFoundHandler: notFoundMiddleware

} as MiddlewareConfig;