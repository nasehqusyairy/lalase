import { redirect } from '@server/core/inertia';
import { getAuth } from '@server/core/session';
import type { MiddlewareArg } from '@server/types';

export default ({ next }: MiddlewareArg) => {
    if (!getAuth()?.id) return redirect('/login');
    next();
}
