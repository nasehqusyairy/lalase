import type { ErrorHandlerTransformer, MiddlewareTransformer } from "@server/types";

export const toRequestHandler: MiddlewareTransformer = middleware => (req, res, next) => middleware({ req, res, next })
export const toErrorHandler: ErrorHandlerTransformer = errorHandler => (err, req, res, next) => errorHandler({ err, req, res, next })