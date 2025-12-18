import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper
 * Wraps async route handlers to catch rejected promises
 * and pass them to error handling middleware
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
