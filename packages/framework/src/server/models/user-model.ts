import type { Model } from "@lalase/oerem";
import { db } from "@server/database/db";
import type { TUser } from "@shared/types";

export default db.model('users', {
    fillable: ['name', 'email', 'password'],
    hidden: ['password'],
}) satisfies Model<TUser>;