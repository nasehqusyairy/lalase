import aboutController from '@server/controllers/about-controller';
import usersController from '@server/controllers/users-controller';
import authController from '@server/controllers/auth-controller';
import authMiddleware from '@server/middlewares/auth-middleware';
import { createRoute } from '@server/lib/route';

const route = createRoute();

route.get('/', async ({ res }) => {
    res.inertia.render('home');
}).name('home.index');

route.prefix('/salam').group(() => {
    route.get('/:nama/:umur', aboutController.salam).name('about.salam')
});

route.get('/login', authController.login).name('auth.login');
route.post('/login', authController.loginPost).name('auth.loginPost');
route.get('/logout', authController.logout).name('auth.logout');

route.prefix('/users').group(() => {
    route.middleware(authMiddleware).group(() => {
        route.get('/', usersController.index).name('users.index')
        route.post('/', usersController.create).name('users.create')
    });
});

export default route.getRouter()
