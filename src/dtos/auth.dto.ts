// Login Request DTO
export interface LoginRequestDto {
    email: string;
    password: string;
}

// Token Pair DTO
export interface TokenPairDto {
    accessToken: string;
    refreshToken: string;
}

// Login Response DTO
export interface LoginResponseDto {
    user: {
        id: string;
        name: string;
        email: string;
    };
    tokens: TokenPairDto;
}

// Refresh Token Request DTO
export interface RefreshTokenRequestDto {
    refreshToken: string;
}

// Refresh Token Response DTO
export interface RefreshTokenResponseDto {
    accessToken: string;
}

// Logout Request DTO
export interface LogoutRequestDto {
    refreshToken: string;
}

// Change Password Request DTO
export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}
