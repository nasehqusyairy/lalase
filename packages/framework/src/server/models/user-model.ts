import type { Model } from "@lalase/oerem";
import { createModel } from "@server/core/database";
import type { TUser } from "@shared/types/models/user";

export default createModel('users', {
    fillable: ['name', 'email', 'password'],
    hidden: ['password'],
}) as Model<TUser>;