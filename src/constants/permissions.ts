/**
 * Application Permissions
 * Define all available permissions in the system
 */
export const Permission = {
    MANAGE_USERS: 'manageUsers',
    GET_USERS: 'getUsers',
    GET_PROFILE: 'getProfile',
    UPDATE_OWN_PROFILE: 'updateOwnProfile',
} as const;

// Type for permission values
export type PermissionType = typeof Permission[keyof typeof Permission];

// Array of all permissions for validation
export const ALL_PERMISSIONS: PermissionType[] = Object.values(Permission);
