import { db } from "@server/database/db";
import { TUser } from "@shared/types";
import { Model } from "oerem";

export const User: Model<TUser> = db.model('users', {
    fillable: ['name', 'email', 'password'],
    hidden: ['password'],
});