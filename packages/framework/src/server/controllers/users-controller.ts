import userModel from "@server/models/user-model";
import type { Controller } from "@server/types";

export default {

    async index({ res }) {
        const users = await userModel.all()
        res.view('users/index', { users })
    },

    async create({ req, res }) {

        res.json({ message: 'User created successfully' })
    }

} satisfies Controller