import { rule } from "@server/core/validation";
import userModel from "@server/models/user-model";
import type { Controller } from "@server/types";

export default {
    async index({ res }) {
        const users = await userModel.all()
        res.view('books/index', { users })
    },

    async create({ req, res }) {
        const validated = await req.validate({
            schema: rule.object({
                title: rule.string().min(3),
                code: rule.number()
            })
        })

        res.json(validated)
    }
} satisfies Controller