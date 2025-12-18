// JWT Configuration
export const jwtConfig: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiration: string | number;
    refreshExpiration: string | number;
    issuer: string;
    audience: string;
} = {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    issuer: 'boilerplate',
    audience: 'boilerplate-users',
};

// Payload interface for JWT tokens
export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}
