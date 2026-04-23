export abstract class HttpError extends Error {
    constructor(
        message: string,
        public status: number
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ValidationError extends HttpError {
    constructor(
        public errors: Record<string, string[]>,
        public old: Record<string, any> = {}
    ) {
        super('Validation failed', 422);
    }
}

export class AuthorizationError extends HttpError {
    constructor(message = 'This action is unauthorized') {
        super(message, 403);
    }
}

