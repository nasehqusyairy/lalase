import { view } from "@server/core/inertia";
import { authorize } from "@server/core/permission";
import userModel from "@server/models/user-model";
import { canReadUsers } from "@server/permissions/user-permission";
import type { Controller } from "@server/types";

export default {

    async index() {
        authorize(canReadUsers())
        const users = await userModel.all()
        return view('users/index', { users })
    },

    async create({ res }) {
        return res.json({ message: 'User created successfully' })
    }

} satisfies Controller
