import express from 'express';
import type { Middleware } from '@server/types';

export default (({ req, res, next }) => express.urlencoded({ extended: true })(req, res, next)) as Middleware;