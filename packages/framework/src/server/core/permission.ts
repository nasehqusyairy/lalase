import { AuthorizationException } from "@server/exception/definitions/authorization-exception";
import { shareProps } from "./inertia";

export function setPermission(permissions: Record<string, boolean>) {
    shareProps({
        allowed: permissions
    });
}

export function authorize(condition: boolean, options?: { or?: string }) {
    if (!condition) {
        throw new AuthorizationException(options?.or);
    }
}