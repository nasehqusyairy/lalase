import vine from '@vinejs/vine';
import { ValidationException } from '@server/lib/exception';
import userModel from "@server/models/user-model";
import type { Controller } from "@server/types";
import type { LoginPayload } from "@shared/types/payloads/login";

export default {

    async login({ req, res }) {
        if ((req.session as any)?.user) {
            res.inertia.location('/');
            return;
        }
        return res.inertia.render('auth/login', {});
    },

    async loginPost({ req, res }) {
        const { email, password } = await req.validate<LoginPayload>(req.body, {
            schema: vine.object({
                email: vine.string().email().minLength(1),
                password: vine.string().minLength(3),
            }),
        });

        const user = await userModel.query(q => q.where('email', email)).first();

        if (!user || user.password !== password) {
            const errors = {
                email: ['Email atau password salah']
            }
            throw new ValidationException(errors);
        }

        (req.session as any).user = {
            id: user.id,
            name: user.name,
            email: user.email,
        };

        const redirectTo = (req.session as any).redirect_to || '/';
        delete (req.session as any).redirect_to;

        return res.inertia.location(redirectTo);

    },

    async logout({ req, res }) {
        delete (req.session as any).user;

        return res.inertia.location('/login');
    },

} satisfies Controller
