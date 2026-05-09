// Core Middlewares - Essential middlewares for the framework
export { sessionMiddleware } from './session';
export { bodyParserMiddleware } from './body-parser';
export { requestMiddleware } from './request';
export { errorMiddleware } from './error';
export { notFoundMiddleware } from './not-found';

// Optional middlewares (also core now)
export { flashMiddleware } from './flash';
export { viewMiddleware } from './view';
export { serveMiddleware } from './serve';

// Re-export types
export type { setVite, getViteInstance } from './serve';
