import express from 'express';
import type { Middleware } from '@server/types';

export default (({ req, res, next }) => express.json()(req, res, next)) as Middleware;
