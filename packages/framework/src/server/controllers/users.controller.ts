import { view } from "@server/core/inertia";
import { authorize } from "@server/core/permission";
import { canReadUsers } from "@shared/permissions/user-permission";
import type { Controller } from "@server/types";
import { getAuth } from "@server/core/session";
import { User } from "@server/models";

export default {

    async index() {
        authorize(canReadUsers(getAuth()))
        const users = await User.query().get()
        return view('users/index', { users })
    },

    async create({ response }) {
        return response.json({ message: 'User created successfully' })
    }

} satisfies Controller
