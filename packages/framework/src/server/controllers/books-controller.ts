import { rule } from "@server/core/validation";
import { User } from "@server/models/model";
import { Controller } from "@server/types";

export const BooksController = {
    index: async ({ res }) => {
        const users = await User.all()
        res.renderProps('books/index', { users })
    },

    create: async ({ req, res }) => {
        const validated = await req.validate({
            schema: rule.object({
                title: rule.string().min(3),
                code: rule.number()
            })
        })

        res.json(validated)
    }
} satisfies Controller