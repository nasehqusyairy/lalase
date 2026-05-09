import express, { type RequestHandler } from 'express';
import multer from 'multer';

const jsonParser: RequestHandler = express.json();
const urlencodedParser: RequestHandler = express.urlencoded({ extended: true });
const multipartParser: RequestHandler = multer().any();

export const bodyParserMiddleware: RequestHandler[] = [
    jsonParser,
    urlencodedParser,
    multipartParser,
];
