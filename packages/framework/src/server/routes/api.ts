import { createRoute } from '@server/helpers/route';
import userModel from '@server/models/user-model';
import type { Application } from 'express';

export default (app: Application) => {
    const route = createRoute(app);

    route.get('/', async ({ res }) => {
        res.json({ message: 'Welcome to the API' });
    }).name('api.index');

    route.get('/users', async ({ res }) => {
        const users = await userModel.all()
        res.json({ data: { users } });
    }).name('api.users');

    return route.getRouter()
}
