import type { TUser } from "@shared/types/models/user";

export function canReadUsers(user?: TUser) {
    return user?.id === 1;
}