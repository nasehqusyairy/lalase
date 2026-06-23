import { field, type ModelDef } from "@lalase/oerem";

export default {
    identifier: 'UserRole',
    table: 'user_role',
    schema: {
        id: field.id().build(),
        user_id: field.foreignId().constrained('users').cascadeOn('delete', 'update').build(),
        role_id: field.foreignId().constrained('roles').cascadeOn('delete', 'update').build()
    }
} satisfies ModelDef