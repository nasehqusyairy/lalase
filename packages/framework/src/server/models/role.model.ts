import { belongsToMany, field, type ModelDef } from "@lalase/oerem";
import userModel from "./user.model";
import userRoleModel from "./user-role.model";

export default {
    identifier: 'Role',
    table: 'roles',
    schema: {
        id: field.id().build(),
        name: field.varchar().build()
    },
    relations: {
        users: belongsToMany(() => userModel, () => userRoleModel, 'role_id', 'user_id')
    }
} satisfies ModelDef