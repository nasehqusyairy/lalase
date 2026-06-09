import aboutController from '@server/controllers/about-controller';
import usersController from '@server/controllers/users-controller';
import authController from '@server/controllers/auth-controller';
import authMiddleware from '@server/middlewares/auth-middleware';
import { view } from '@server/core/inertia';
import { RouteBuilder } from '@server/core/router';
import guestMiddleware from '@server/middlewares/guest-middleware';

const route = new RouteBuilder();

route.get('/', async () => {
    return view('home');
}).name('home.index');

route.prefix('/salam').group(() => {
    route.get('/:nama/:umur', aboutController.salam).name('about.salam')
});

route.get('/login', authController.index)
    .middleware(guestMiddleware).name('auth.index')
route.post('/login', authController.login).name('auth.login');
route.get('/logout', authController.logout).name('auth.logout');

route.prefix('/users').group(() => {
    route.middleware(authMiddleware).group(() => {
        route.get('/', usersController.index).name('users.index')
        route.post('/', usersController.create).name('users.create')
    });
});

export default route.getRouter()
