import { RoleType } from '../constants/roles';

/**
 * DTO for creating a used (internal use mostly, usually handled via auth/register)
 */
export interface CreateUserDto {
    name: string;
    email: string;
    password: string;
    role?: RoleType;
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDto {
    name?: string;
    email?: string;
}

/**
 * DTO for user response
 */
export interface UserResponseDto {
    id: string;
    name: string;
    email: string;
    role: RoleType;
    createdAt: Date;
    updatedAt: Date;
}