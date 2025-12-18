/**
 * Custom API Error class
 * Used for throwing errors with HTTP status codes
 */
export class ApiError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where error was thrown (only available on V8)
        Error.captureStackTrace(this, this.constructor);
    }
}
