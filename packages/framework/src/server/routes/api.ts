import userModel from '@server/models/user.model';
import { RouteBuilder } from '@server/core/router';

const route = new RouteBuilder();

route.get('/', async ({ res }) => {
    return res.json({ message: 'Welcome to the API' });
}).name('api.index');

route.get('/users', async ({ res }) => {
    const users = await userModel.all()
    return res.json({ data: { users } });
}).name('api.users');

export default route.getRouter()

