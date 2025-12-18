export interface GoogleProfile {
    id: string;
    displayName: string;
    name?: {
        familyName?: string;
        givenName?: string;
    };
    emails: Array<{
        value: string;
        verified: boolean;
    }>;
    photos: Array<{
        value: string;
    }>;
    provider: 'google';
    _raw: string;
    _json: any;
}

export interface GoogleAuthenticatedUser {
    id: string;
    email: string;
    name: string;
    googleId: string;
    profilePicture?: string;
}

export interface GoogleAuthData {
    googleId: string;
    email: string;
    name: string;
    profilePicture?: string;
}
