import express from 'express';
import multer from 'multer';
import type { Middleware } from '@server/types';

const jsonParser: Middleware = ({ req, res, next }) => express.json()(req, res, next);
const urlencodedParser: Middleware = ({ req, res, next }) => express.urlencoded({ extended: true })(req, res, next);
const multipartParser: Middleware = ({ req, res, next }) => multer().any()(req, res, next);

export const bodyParserMiddleware: Middleware[] = [
    jsonParser,
    urlencodedParser,
    multipartParser,
];
