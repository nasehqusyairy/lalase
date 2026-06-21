import { view } from "@server/core/inertia";
import { authorize } from "@server/core/permission";
import userModel from "@server/models/user.model";
import { canReadUsers } from "@shared/permissions/user-permission";
import type { Controller } from "@server/types";
import { getAuth } from "@server/core/session";
import type { TUser } from "@shared/types/models/user";
import { User } from "@server/models";

export default {

    async index() {
        authorize(canReadUsers(getAuth() as TUser))
        const users = await User.query()
        return view('users/index', { users })
    },

    async create({ res }) {
        return res.json({ message: 'User created successfully' })
    }

} satisfies Controller
