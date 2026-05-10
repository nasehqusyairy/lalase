import { createRoute } from '@server/core/router';
import userModel from '@server/models/user-model';
import { Router } from 'express';

const Route = createRoute();

Route.get('/', async ({ res }) => {
    res.json({ message: 'Welcome to the API' });
}).name('api.index');

Route.get('/users', async ({ res }) => {
    const users = await userModel.all()
    res.json({ data: { users } });
}).name('api.users');

export const api: Router = Route.getRouter()
