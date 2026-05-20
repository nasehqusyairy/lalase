import type { Model } from "@lalase/oerem";
import { createModel } from "@server/config/database";
import type { TUser } from "@shared/types/models/user";

export default createModel('users', {
    fillable: ['name', 'email', 'password'],
    hidden: ['password'],
}) as Model<TUser>;