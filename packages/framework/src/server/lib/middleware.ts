import type { ErrorHandlerTransformer, MiddlewareTransformer } from "@server/types";

export const toRequestHandler: MiddlewareTransformer = middleware => async (req, res, next) => await middleware({ req, res, next })
export const toErrorHandler: ErrorHandlerTransformer = errorHandler => async (err, req, res, next) => await errorHandler({ err, req, res, next })