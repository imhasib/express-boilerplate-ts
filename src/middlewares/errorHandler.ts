import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';
import logger from '../config/logger';

/**
 * Error handling middleware
 * Catches all errors and sends consistent JSON responses
 */
export const errorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle ApiError
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Handle Mongoose validation errors
    else if (err.name === 'ValidationError') {
        statusCode = httpStatus.BAD_REQUEST;
        message = Object.values(err.errors)
            .map((e: any) => e.message)
            .join(', ');
    }
    // Handle Mongoose duplicate key errors
    else if (err.code === 11000) {
        statusCode = httpStatus.CONFLICT;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    }
    // Handle Mongoose CastError (invalid ObjectId)
    else if (err.name === 'CastError') {
        statusCode = httpStatus.BAD_REQUEST;
        message = `Invalid ${err.path}: ${err.value}`;
    }
    // Handle other errors
    else if (err.message) {
        message = err.message;
    }

    // Log error using Winston
    logger.error(`${message} - ${err.stack || ''}`);

    // Send error response
    res.status(statusCode).json({
        error: {
            statusCode,
            message,
        },
    });
};
