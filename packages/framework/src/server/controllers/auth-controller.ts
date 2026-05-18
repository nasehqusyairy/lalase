import vine from '@vinejs/vine';
import { ValidationException } from '@server/lib/exception';
import userModel from "@server/models/user-model";
import type { Controller } from "@server/types";
import type { LoginPayload } from "@shared/types/payloads/login";

export default {

    async login({ req, res }) {
        // If already logged in, redirect to home
        if ((req.session as any)?.user) {
            res.inertia.location('/');
            return;
        }
        res.inertia.render('auth/login', {});
    },

    async loginPost({ req, res }) {
        // Validate request body using VineJS
        const { email, password } = await req.validate<LoginPayload>(req.body, {
            schema: vine.object({
                email: vine.string().email().minLength(1),
                password: vine.string().minLength(3),
            }),
        });

        // Find user by email using query builder (password tidak di-hash karena masih uji coba)
        const user = await userModel.query(q => q.where('email', email)).first();

        if (!user || user.password !== password) {
            throw new ValidationException({
                email: ['Email atau password salah']
            });
        }

        // Set user session
        (req.session as any).user = {
            id: user.id,
            name: user.name,
            email: user.email,
        };

        // Redirect ke home atau halaman yang diminta
        const redirectTo = (req.session as any).redirect_to || '/';
        delete (req.session as any).redirect_to;

        res.inertia.location(redirectTo);

    },

    async logout({ req, res }) {
        // Clear user session
        delete (req.session as any).user;

        res.inertia.location('/login');
    },

} satisfies Controller
