const controllerTemplate = `import type { Controller } from "@server/types";
import { rule } from "@server/core/validation";
import model from "@server/models/{name}-model";

export default {

    async index({ res }) {
        const {name} = await model.all()
        res.view('{name}/index', { {name} })
    },

    async create({ req, res }) {
        const validated = await req.validate({
            schema: rule.object({
                // Define your validation rules here
            })
        })

        const result = await model.create(validated)

        res.json(result)
    }

} satisfies Controller`;

export default controllerTemplate;
