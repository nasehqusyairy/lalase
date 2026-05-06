import { rule } from "@server/core/validation";
import { User } from "@server/models/model";
import type { Controller } from "@server/types";

export default {

    async index({ res }) {
        const users = await User.all()
        res.renderProps('users/index', { users })
    },

    async create({ req, res }) {
        const validated = await req.validate({
            schema: rule.object({
                name: rule.string().min(3),
                email: rule.email(),
                password: rule.string().min(6)
            })
        })

        const user = await User.create(validated)

        res.json(user)
    }

} satisfies Controller