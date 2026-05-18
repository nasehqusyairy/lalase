export abstract class HttpException extends Error {
    constructor(
        message: string,
        public status: number
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ValidationException extends HttpException {
    constructor(
        public errors: Record<string, string[]>,
        public old: Record<string, any> = {}
    ) {
        super('Validation failed', 422);
    }
}

export class AuthorizationException extends HttpException {
    constructor(message = 'This action is unauthorized') {
        super(message, 403);
    }
}
