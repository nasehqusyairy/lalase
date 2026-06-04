import { HttpException } from "./http-exception";

export class AuthorizationException extends HttpException {
    constructor(message = 'This action is unauthorized') {
        super(message, 403);
    }
}
