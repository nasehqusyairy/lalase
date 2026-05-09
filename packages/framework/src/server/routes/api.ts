import { Route } from '@server/core/router';
import { Router } from 'express';

Route.get('/', async ({ res }) => {
    res.json({ message: 'Welcome to the API' });
}).name('api.index');

export const api: Router = Route.getRouter()