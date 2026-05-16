import type { ErrorHandlerTransformer, MiddlewareTransformer } from "@server/types";

export const toRequestHandler: MiddlewareTransformer = (middleware, app) => {
    return (req, res, next) => {
        middleware({ app, req, res, next });
    }
}

export const toErrorHandler: ErrorHandlerTransformer = (errorHandler, app) => {
    return (err, req, res, next) => {
        errorHandler({ app, err, req, res, next });
    }
}