import { Request, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';
import { PermissionType } from '../constants/permissions';
import { RoleType } from '../constants/roles';

/**
 * Middleware to check if user has a specific permission
 */
export const requirePermission = (permission: PermissionType) => {
    return (req: Request, _res: unknown, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        if (!req.user.permissions.includes(permission)) {
            return next(new ApiError(httpStatus.FORBIDDEN, `Permission denied. Required permission: ${permission}`));
        }

        next();
    };
};

/**
 * Middleware to check if user has a specific role
 */
export const requireRole = (role: RoleType) => {
    return (req: Request, _res: unknown, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        if (req.user.role !== role) {
            return next(new ApiError(httpStatus.FORBIDDEN, `Access denied. Required role: ${role}`));
        }

        next();
    };
};

/**
 * Middleware to check if user has at least one of the specified permissions
 */
export const requireAnyPermission = (permissions: PermissionType[]) => {
    return (req: Request, _res: unknown, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        const hasPermission = permissions.some(permission =>
            req.user!.permissions.includes(permission)
        );

        if (!hasPermission) {
            return next(new ApiError(httpStatus.FORBIDDEN, `Permission denied. Required one of: ${permissions.join(', ')}`));
        }

        next();
    };
};

/**
 * Middleware to check if user has all of the specified permissions
 */
export const requireAllPermissions = (permissions: PermissionType[]) => {
    return (req: Request, _res: unknown, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        const hasAllPermissions = permissions.every(permission =>
            req.user!.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            return next(new ApiError(httpStatus.FORBIDDEN, `Permission denied. Required all of: ${permissions.join(', ')}`));
        }

        next();
    };
};

/**
 * Middleware to check resource ownership
 * Useful for endpoints where users can only access their own resources
 */
export const requireOwnership = (userIdParam: string = 'id') => {
    return (req: Request, _res: unknown, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        const resourceUserId = req.params[userIdParam];

        // Allow if user is accessing their own resource
        if (req.user.id === resourceUserId) {
            return next();
        }

        // Deny access if not owner
        return next(new ApiError(httpStatus.FORBIDDEN, 'Access denied. You can only access your own resources.'));
    };
};
