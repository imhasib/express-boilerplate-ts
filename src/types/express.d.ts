import { PermissionType } from '../constants/permissions';
import { RoleType } from '../constants/roles';

/**
 * Extend Express Request type to include authenticated user with role and permissions
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: RoleType;
                permissions: PermissionType[];
            };
        }
    }
}

export { };
