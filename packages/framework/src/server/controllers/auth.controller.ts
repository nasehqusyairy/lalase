import type { Controller } from "@server/types";
import { redirect, view } from '@server/core/inertia';
import { destroyAuth, setAuth } from '@server/core/session';

export default {

    index() {
        return view('auth/login', {});
    },

    async login({ req }) {
        await setAuth(req.body)
        return redirect('/');
    },

    async logout() {
        await destroyAuth();
        return redirect('/login');
    },

} satisfies Controller
