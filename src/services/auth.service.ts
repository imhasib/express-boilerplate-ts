import { User, IUser } from '../models/user.model';
import { Token } from '../models/token.model';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';
import { generateTokenPair, verifyRefreshToken } from './token.service';
import logger from '../config/logger';
import { GoogleAuthData } from '../types/google.types';
import * as userService from './user.service';

/**
 * Token pair response interface
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/**
 * Authenticate user with email and password
 * Returns JWT token pair on success
 */
export const authenticateUser = async (email: string, password: string): Promise<TokenPair> => {
    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        logger.warn(`Login attempt failed: User not found for email ${email}`);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        logger.warn(`Login attempt failed: Invalid password for email ${email}`);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    // Generate token pair
    const tokens = generateTokenPair(user._id.toString(), user.email, user.role);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await Token.create({
        token: tokens.refreshToken,
        userId: user._id,
        expiresAt,
    });

    logger.info(`User authenticated successfully: ${user.email}`);

    return tokens;
};

/**
 * Refresh access token using refresh token
 * Returns new access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
    // Verify refresh token signature and expiration
    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const tokenDoc = await Token.findOne({ token: refreshToken });

    if (!tokenDoc) {
        logger.warn(`Refresh token not found in database for user ${payload.userId}`);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
        // Remove expired token
        await Token.deleteOne({ token: refreshToken });
        logger.warn(`Refresh token expired for user ${payload.userId}`);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token expired');
    }

    // Verify user still exists
    const user = await User.findById(payload.userId);

    if (!user) {
        // User was deleted, remove token
        await Token.deleteOne({ token: refreshToken });
        logger.warn(`User not found for refresh token: ${payload.userId}`);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
    }

    // Generate new token pair using role from the verified refresh token
    const tokens = generateTokenPair(user._id.toString(), user.email, payload.role);

    // Delete old refresh token and save new one
    await Token.deleteOne({ token: refreshToken });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Token.create({
        token: tokens.refreshToken,
        userId: user._id,
        expiresAt,
    });

    logger.info(`Access token refreshed for user: ${user.email}`);

    return tokens.accessToken;
};

/**
 * Revoke refresh token (logout)
 */
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
    // Verify token format (don't throw error if verification fails)
    try {
        verifyRefreshToken(refreshToken);
    } catch (error) {
        // Token is invalid or expired, but we'll try to delete it anyway
        logger.warn('Attempted to revoke invalid/expired refresh token');
    }

    // Delete refresh token from database
    const result = await Token.deleteOne({ token: refreshToken });

    if (result.deletedCount === 0) {
        logger.warn('Refresh token not found in database during revocation');
        throw new ApiError(httpStatus.NOT_FOUND, 'Refresh token not found');
    }

    logger.info('Refresh token revoked successfully');
};

/**
 * Validate if refresh token exists in database
 */
export const validateRefreshToken = async (refreshToken: string): Promise<boolean> => {
    const tokenDoc = await Token.findOne({ token: refreshToken });
    return tokenDoc !== null && tokenDoc.expiresAt > new Date();
};

/**
 * Change user password
 */
export const changePassword = async (userId: string, data: import('../dtos/auth.dto').ChangePasswordDto): Promise<void> => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    const isPasswordMatch = await user.comparePassword(data.oldPassword);

    if (!isPasswordMatch) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect old password');
    }

    user.password = data.newPassword; // User model pre-save hook will hash this
    await user.save();
};

/**
 * Authenticate or register user via Google OAuth
 */
export const authenticateGoogleUser = async (googleData: GoogleAuthData): Promise<IUser> => {
    try {
        // 1. Try to find user by Google ID
        let user = await userService.getUserByGoogleId(googleData.googleId);

        if (user) {
            // User exists with this Google account
            logger.info(`Google user login: ${user.email}`);
            return user;
        }

        // 2. Try to find user by email (may have registered with password)
        user = await userService.getUserByEmailInternal(googleData.email);

        if (user) {
            // Email exists - link Google account to existing user
            logger.info(`Linking Google account to existing user: ${user.email}`);
            user = await userService.linkGoogleAccount(
                user._id.toString(),
                googleData.googleId,
                googleData.profilePicture
            );
            return user;
        }

        // 3. Create new user with Google profile
        logger.info(`Creating new Google user: ${googleData.email}`);
        user = await userService.createGoogleUser(googleData);
        return user;

    } catch (error) {
        logger.error('Google authentication error:', error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Failed to authenticate with Google'
        );
    }
};
