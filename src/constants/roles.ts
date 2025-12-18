import { Permission, PermissionType } from './permissions';

/**
 * Application Roles
 * Define all available roles in the system
 */
export const Role = {
    ADMIN: 'admin',
    USER: 'user',
    THERAPIST: 'therapist',
} as const;

// Type for role values
export type RoleType = typeof Role[keyof typeof Role];

// Array of all roles for validation
export const ALL_ROLES: RoleType[] = Object.values(Role);

/**
 * Role to Permissions Mapping
 * Defines which permissions each role has
 */
export const RolePermissions: Record<RoleType, PermissionType[]> = {
    [Role.ADMIN]: [
        Permission.MANAGE_USERS,
        Permission.GET_USERS,
        Permission.GET_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
    ],
    [Role.USER]: [
        Permission.GET_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
    ],
    [Role.THERAPIST]: [
        Permission.GET_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
    ],
};

/**
 * Get permissions for a given role
 */
export const getPermissionsForRole = (role: RoleType): PermissionType[] => {
    return RolePermissions[role] || [];
};

/**
 * Check if a role has a specific permission
 */
export const roleHasPermission = (role: RoleType, permission: PermissionType): boolean => {
    const permissions = getPermissionsForRole(role);
    return permissions.includes(permission);
};
