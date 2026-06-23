import { belongsTo, field, type ModelDef } from "@lalase/oerem";
import userModel from "./user.model";

export default {
    identifier: 'Post',
    table: 'posts',
    schema: {
        id: field.id().build(),
        title: field.varchar().build(),
        body: field.text().build(),
        user_id: field.foreignId().constrained('users').cascadeOn('delete', 'update').build()
    },
    relations: {
        author: belongsTo(() => userModel, 'user_id')
    }
} satisfies ModelDef