import { field, hasMany, type ModelDef } from "@lalase/oerem";
import postModel from "./post.model";

export default {
    identifier: 'User',
    table: 'users',
    schema: {
        id: field.bigInteger().primary().build(),
        name: field.varchar().build(),
        email: field.varchar().unique().build(),
        password: field.varchar().hash().hidden().build()
    },
    relations: {
        posts: hasMany((): any => postModel, 'user_id')
    }
} satisfies ModelDef