import { RouteBuilder } from '@server/core/router';
import { User } from '@server/models';

const route = new RouteBuilder();

route.get('/', async ({ response }) => {
    return response.json({ message: 'Welcome to the API' });
}).name('api.index');

route.get('/users', async ({ response }) => {
    const users = await User.query().get()
    return response.json({ data: { users } });
}).name('api.users');

export default route.getRouter()

