import type { Request, Response } from "express";
import * as userService from "../services/user.service";
import * as authService from "../services/auth.service";
import httpStatus from "../constants/httpStatus";
import { generateTokenPair, verifyRefreshToken, saveRefreshToken } from "../services/token.service";
import { IUser } from "../models/user.model";
import { OAuth2Client } from 'google-auth-library';
import logger from "../config/logger";

/**
 * Register a new user and return JWT tokens
 */
export async function registerUser(request: Request, response: Response) {
    const user = await userService.createUser(request.body);

    // Generate JWT tokens for the new user
    const tokens = generateTokenPair(user.id, user.email, user.role);

    // Store refresh token in database
    const { Token } = await import("../models/token.model");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Token.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
    });

    response.status(httpStatus.CREATED).json({
        user,
        tokens,
    });
}

/**
 * Login user and return JWT tokens
 */
export async function loginUser(request: Request, response: Response) {
    const { email, password } = request.body;

    const tokens = await authService.authenticateUser(email, password);

    // Get user data (without password)
    const user = await userService.getUserByEmail(email);

    response.status(httpStatus.OK).json({
        user,
        tokens,
    });
}

/**
 * Refresh access token
 */
export async function refreshToken(request: Request, response: Response) {
    const { refreshToken } = request.body;

    const newAccessToken = await authService.refreshAccessToken(refreshToken);

    response.status(httpStatus.OK).json({
        accessToken: newAccessToken,
    });
}

/**
 * Logout user by revoking refresh token
 */
export async function logoutUser(request: Request, response: Response) {
    const { refreshToken } = request.body;

    await authService.revokeRefreshToken(refreshToken);

    response.status(httpStatus.OK).json({
        message: "Logged out successfully",
    });
}

/**
 * Change user password
 */
export async function changePassword(request: Request, response: Response) {
    const userId = request.user!.id; // Authenticated via JWT
    await authService.changePassword(userId, request.body);

    response.status(httpStatus.OK).json({
        message: "Password changed successfully",
    });
}

/**
 * Google OAuth callback handler (for web)
 */
export async function googleCallback(request: Request, response: Response): Promise<Response> {
    const user = request.user as unknown as IUser;

    if (!user) {
        return response.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Authentication failed',
        });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
    );

    // Store refresh token in database
    const decoded = verifyRefreshToken(tokens.refreshToken);
    await saveRefreshToken(
        tokens.refreshToken,
        user._id.toString(),
        new Date(decoded.exp! * 1000)
    );

    // Return user data and tokens
    return response.status(httpStatus.OK).json({
        success: true,
        message: 'Google authentication successful',
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
                authProvider: user.authProvider,
            },
            tokens,
        },
    });
}

/**
 * Google Sign-In for Mobile (Android/iOS)
 * Verifies Google ID token and returns JWT tokens
 */
export async function googleMobileAuth(request: Request, response: Response): Promise<Response> {
    const { idToken } = request.body;

    if (!idToken) {
        return response.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Google ID token is required',
        });
    }

    try {
        // Initialize Google OAuth2 client
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Verify the ID token
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email_verified) {
            return response.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Email not verified by Google',
            });
        }

        // Extract user data from Google token
        const googleData = {
            googleId: payload.sub,
            email: payload.email!,
            name: payload.name || payload.email!,
            profilePicture: payload.picture,
        };

        logger.info(`Google mobile auth attempt for: ${googleData.email}`);

        // Find or create user (same logic as web OAuth)
        const user = await authService.authenticateGoogleUser(googleData);

        // Generate JWT tokens
        const tokens = generateTokenPair(
            user._id.toString(),
            user.email,
            user.role
        );

        // Store refresh token in database
        const decoded = verifyRefreshToken(tokens.refreshToken);
        await saveRefreshToken(
            tokens.refreshToken,
            user._id.toString(),
            new Date(decoded.exp! * 1000)
        );

        // Return user data and tokens
        return response.status(httpStatus.OK).json({
            success: true,
            message: 'Google authentication successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    profilePicture: user.profilePicture,
                    authProvider: user.authProvider,
                },
                tokens,
            },
        });
    } catch (error: any) {
        logger.error('Google mobile auth error:', error);
        return response.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid Google ID token',
            error: error.message,
        });
    }
}
