import jwt, { SignOptions } from 'jsonwebtoken';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';
import { jwtConfig, JwtPayload } from '../config/token.config';
import { Token } from '../models/token.model';

/**
 * Token pair interface
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/**
 * Generate an access token for a user
 */
export const generateAccessToken = (userId: string, email: string, role: string): string => {
    const payload: JwtPayload = {
        userId,
        email,
        role,
    };

    return jwt.sign(payload, jwtConfig.accessSecret, {
        expiresIn: jwtConfig.accessExpiration,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
    } as SignOptions);
};

/**
 * Generate a refresh token for a user
 */
export const generateRefreshToken = (userId: string, email: string, role: string): string => {
    const payload: JwtPayload = {
        userId,
        email,
        role,
    };

    return jwt.sign(payload, jwtConfig.refreshSecret, {
        expiresIn: jwtConfig.refreshExpiration,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
    } as SignOptions);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, email: string, role: string): TokenPair => {
    return {
        accessToken: generateAccessToken(userId, email, role),
        refreshToken: generateRefreshToken(userId, email, role),
    };
};

/**
 * Verify an access token
 */
export const verifyAccessToken = (token: string): JwtPayload => {
    try {
        return jwt.verify(token, jwtConfig.accessSecret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
        }) as JwtPayload;
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Access token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid access token');
        }
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Token verification failed');
    }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
    try {
        return jwt.verify(token, jwtConfig.refreshSecret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
        }) as JwtPayload;
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
        }
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Token verification failed');
    }
};

/**
 * Save refresh token to database
 */
export const saveRefreshToken = async (
    token: string,
    userId: string,
    expiresAt: Date
): Promise<void> => {
    await Token.create({
        token,
        userId,
        expiresAt,
    });
};
