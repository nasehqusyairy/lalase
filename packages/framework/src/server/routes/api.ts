import { RouteBuilder } from '@server/core/router';
import { User } from '@server/models';

const route = new RouteBuilder();

route.get('/', async ({ res }) => {
    return res.json({ message: 'Welcome to the API' });
}).name('api.index');

route.get('/users', async ({ res }) => {
    const users = await User.query().get()
    return res.json({ data: { users } });
}).name('api.users');

export default route.getRouter()

