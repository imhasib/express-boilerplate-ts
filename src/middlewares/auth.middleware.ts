import passport from '../config/passport.config';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';
import { getPermissionsForRole } from '../constants/roles';

/**
 * Middleware to authenticate requests using JWT
 * Protects routes by requiring a valid JWT access token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            // Authentication failed
            const message = info?.message || 'Unauthorized';
            return next(new ApiError(httpStatus.UNAUTHORIZED, message));
        }

        // Authentication successful, attach user with permissions to request
        req.user = {
            ...user,
            permissions: getPermissionsForRole(user.role),
        };

        next();
    })(req, res, next);
};
