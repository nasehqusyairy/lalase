import { createRoute } from '@server/core/router';
import userModel from '@server/models/user-model';
import { Router } from 'express';

const route = createRoute();

route.get('/', async ({ res }) => {
    res.json({ message: 'Welcome to the API' });
}).name('api.index');

route.get('/users', async ({ res }) => {
    const users = await userModel.all()
    res.json({ data: { users } });
}).name('api.users');

export const api: Router = route.getRouter()
