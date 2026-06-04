import { getAuth } from "@server/core/session";

export function canReadUsers() {
    return getAuth()?.id === 1;
}