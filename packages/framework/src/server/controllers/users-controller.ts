import { rule } from "@server/lib/validation";
import userModel from "@server/models/user-model";
import type { Controller } from "@server/types";

export default {

    async index({ res }) {
        const users = await userModel.all()
        res.view('users/index', { users })
    },

    async create({ req, res }) {
        const validated = await req.validate({
            schema: rule.object({
                name: rule.string().min(3),
                email: rule.email(),
                password: rule.string().min(6)
            })
        })

        const user = await userModel.create(validated)

        res.json(user)
    }

} satisfies Controller