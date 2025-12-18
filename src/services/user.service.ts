import { User, IUser } from '../models/user.model';
import mongoose from 'mongoose';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto';
import { GoogleAuthData } from '../types/google.types';

/**
 * Convert Mongoose user document to response DTO (excluding password)
 */
const toUserResponse = (user: IUser): UserResponseDto => {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

/**
 * Create a new user in the database
 * @throws ApiError if email already exists
 */
export const createUser = async (userData: CreateUserDto): Promise<UserResponseDto> => {
    try {
        const user = new User(userData);
        await user.save();
        return toUserResponse(user);
    } catch (error: any) {
        // Handle duplicate email error
        if (error.code === 11000) {
            throw new ApiError(httpStatus.CONFLICT, 'Email already exists');
        }
        throw error;
    }
};

/**
 * Get user by ID
 * @throws ApiError if user not found or invalid ID
 */
export const getUserById = async (id: string): Promise<UserResponseDto> => {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
    }

    const user = await User.findById(id);

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    return toUserResponse(user);
};

/**
 * Get all users from the database
 */
export const getAllUsers = async (): Promise<UserResponseDto[]> => {
    const users = await User.find();
    return users.map(toUserResponse);
};

/**
 * Find user by email
 */
export const getUserByEmail = async (email: string): Promise<UserResponseDto | null> => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        return null;
    }

    return toUserResponse(user);
};

/**
 * Update user by ID
 */
export const updateUser = async (id: string, updateData: UpdateUserDto): Promise<UserResponseDto> => {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
    }

    // Check if email is being updated and if it's already taken
    if (updateData.email) {
        const existingUser = await User.findOne({ email: updateData.email.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== id) {
            throw new ApiError(httpStatus.CONFLICT, 'Email already taken');
        }
    }

    const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    return toUserResponse(user);
};

/**
 * Delete user by ID
 */
export const deleteUser = async (id: string): Promise<void> => {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Also delete associated tokens
    const { Token } = await import("../models/token.model");
    await Token.deleteMany({ userId: id });
};

/**
 * Find user by Google ID
 */
export const getUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
    return await User.findOne({ googleId });
};

/**
 * Find user by email (returns full user document, not DTO)
 */
export const getUserByEmailInternal = async (email: string): Promise<IUser | null> => {
    return await User.findOne({ email: email.toLowerCase() });
};

/**
 * Create user with Google profile
 */
export const createGoogleUser = async (googleData: GoogleAuthData): Promise<IUser> => {
    try {
        const user = new User({
            ...googleData,
            authProvider: 'google',
            role: 'user',
        });
        await user.save();
        return user;
    } catch (error: any) {
        if (error.code === 11000) {
            throw new ApiError(httpStatus.CONFLICT, 'Email already exists');
        }
        throw error;
    }
};

/**
 * Link Google account to existing user
 */
export const linkGoogleAccount = async (
    userId: string,
    googleId: string,
    profilePicture?: string
): Promise<IUser> => {
    const user = await User.findByIdAndUpdate(
        userId,
        {
            googleId,
            profilePicture,
        },
        { new: true }
    );

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    return user;
};
