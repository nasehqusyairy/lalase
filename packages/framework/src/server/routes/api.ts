import { createRoute } from '@server/lib/route';
import userModel from '@server/models/user-model';

const route = createRoute();

route.get('/', async ({ res }) => {
    return res.json({ message: 'Welcome to the API' });
}).name('api.index');

route.get('/users', async ({ res }) => {
    const users = await userModel.all()
    return res.json({ data: { users } });
}).name('api.users');

export default route.getRouter()

