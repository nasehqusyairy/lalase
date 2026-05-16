import aboutController from '@server/controllers/about-controller';
import usersController from '@server/controllers/users-controller';
import { createRoute } from '@server/helpers/route';
import type { Application } from 'express';

export default (app: Application) => {
    const route = createRoute(app);

    route.get('/', async ({ res }) => {
        res.inertia.render('home');
    }).name('home.index');

    route.prefix('/salam').group(() => {
        route.get('/:nama/:umur', aboutController.salam).name('about.salam')
    });

    route.prefix('/users').group(() => {
        route.get('/', usersController.index).name('users.index')
        route.post('/', usersController.create).name('users.create')
    });

    return route.getRouter()
}
