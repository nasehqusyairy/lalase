import { belongsToMany, field, hasMany, type ModelDef } from "@lalase/oerem";
import postModel from "./post.model";
import roleModel from "./role.model";
import userRoleModel from "./user-role.model";

export default {
    identifier: 'User',
    table: 'users',
    schema: {
        id: field.id().build(),
        name: field.varchar().build(),
        email: field.varchar().unique().build(),
        password: field.varchar().hash().hidden().build()
    },
    relations: {
        posts: hasMany((): any => postModel, 'user_id'),
        roles: belongsToMany((): any => roleModel, (): any => userRoleModel, 'user_id', 'role_id')

    }
} satisfies ModelDef