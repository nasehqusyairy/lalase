import type { TUser } from "@shared/types/models/user.types.js";

type AuthUser = { id: number };

export function canReadUsers(user?: AuthUser) {
    return user?.id === 1;
}
