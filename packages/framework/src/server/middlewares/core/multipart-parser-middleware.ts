import multer from 'multer';
import type { Middleware } from '@server/types';

export default (({ req, res, next }) => multer().any()(req, res, next)) as Middleware;