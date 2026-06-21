import { belongsTo, field, type ModelDef } from "@lalase/oerem";
import userModel from "./user.model";

export default {
    identifier: 'Post',
    table: 'posts',
    schema: {
        id: field.bigInteger().primary().build(),
        title: field.varchar().build(),
        body: field.text().build(),
        user_id: field.bigInteger().foreign().constrained('users').cascadeOn('delete', 'update').build()
    },
    relations: {
        author: belongsTo(() => userModel, 'user_id')
    }
} satisfies ModelDef