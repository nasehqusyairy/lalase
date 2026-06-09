import { AuthorizationException } from "@server/exception/definitions/authorization-exception";

export function authorize(condition: boolean, options?: { or?: string }) {
    if (!condition) {
        throw new AuthorizationException(options?.or);
    }
}