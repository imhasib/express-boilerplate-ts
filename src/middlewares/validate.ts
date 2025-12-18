import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiError } from "../errors/ApiError";
import httpStatus from "../constants/httpStatus";

// Generic validation middleware factory
export const validate = <T extends z.ZodTypeAny>(schema: T) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const picked = { params: req.params, query: req.query, body: req.body };
        const result = schema.safeParse(picked);
        if (!result.success) {
            const error = result.error;
            const errorMessages = error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            }));
            const message = errorMessages.map(e => e.message).join(', ');
            return next(new ApiError(httpStatus.BAD_REQUEST, message));
        }
        return next();
    };
};
