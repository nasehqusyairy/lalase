import { createRoute } from '@server/core/router';
import { Router } from 'express';
import aboutController from '@server/controllers/about-controller';
import usersController from '@server/controllers/users-controller';

const route = createRoute();

route.get('/', async ({ res }) => {
    res.view('home');
}).name('home.index');

route.prefix('/salam').group(() => {
    route.get('/:nama/:umur', aboutController.salam).name('about.salam')
});

route.prefix('/users').group(() => {
    route.get('/', usersController.index).name('users.index')
    route.post('/', usersController.create).name('users.create')
});

export const web: Router = route.getRouter()
