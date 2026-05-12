import type { Model } from "@lalase/oerem";
import { createModel } from "@server/bootstrap/database";
import type { TUser } from "@shared/types";

export default createModel('users', {
    fillable: ['name', 'email', 'password'],
    hidden: ['password'],
}) as Model<TUser>;