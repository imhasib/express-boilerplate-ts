import { z } from "zod";

// Zod schema for user registration
export const registerUserSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
        email: z.email("Invalid email format"),
        password: z.string().min(6, "Password must be at least 6 characters").max(50, "Password must be less than 50 characters"),
    })
});

// Zod schema for user response
export const userSchema = z.object({
    body: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        createdAt: z.date(),
        updatedAt: z.date(),
    })
});

// Zod schema for user ID param validation
export const userIdParamSchema = z.object({
    params: z.object({
        id: z.string().min(1, "ID is required"),
    })
});

// Zod schema for login
export const loginSchema = z.object({
    body: z.object({
        email: z.email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
    })
});

// Zod schema for refresh token
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, "Refresh token is required"),
    })
});

// Zod schema for logout
export const logoutSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, "Refresh token is required"),
    })
});

export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(1, 'Old password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    })
});

export const updateUserSchema = z.object({
    params: z.object({
        id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
            message: 'Invalid user ID format',
        }),
    }),
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
        email: z.string().email('Invalid email address').optional(),
    }).refine(data => data.name || data.email, {
        message: "At least one field (name or email) must be provided for update"
    }),
});

// Infer TypeScript types from Zod schemas
export type UserRegistrationDto = z.infer<typeof registerUserSchema>['body'];
export type UserDto = z.infer<typeof userSchema>['body'];
export type UserIdParam = z.infer<typeof userIdParamSchema>['params'];
export type LoginDto = z.infer<typeof loginSchema>['body'];
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutDto = z.infer<typeof logoutSchema>['body'];
