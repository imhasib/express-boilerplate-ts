import Router, { Request, Response } from 'express';
import { getUserById, getUsers, updateUser, deleteUser } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { userIdParamSchema, updateUserSchema } from '../validations/user.validation';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission, requireAnyPermission } from '../middlewares/permission.middleware';
import { Permission } from '../constants/permissions';
import { ApiError } from '../errors/ApiError';
import httpStatus from '../constants/httpStatus';

const router = Router();

// Apply JWT authentication to all user routes
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions (requires getUsers)
 */
router.get('/', requirePermission(Permission.GET_USERS), asyncHandler(getUsers));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Users can view their own profile. Admins can view any profile.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (MongoDB ObjectId)
 *         example: 674442a1f8e9c12345678901
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Cannot view other users' profiles
 *       404:
 *         description: User not found
 */
// Users can view own profile OR admin can view any profile
router.get('/:id',
    validate(userIdParamSchema),
    requireAnyPermission([Permission.GET_PROFILE, Permission.GET_USERS]),
    asyncHandler(async (req: Request, res: Response) => {
        // Check if user is viewing their own profile or has admin permissions
        if (req.user!.id !== req.params.id && !req.user!.permissions.includes(Permission.GET_USERS)) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only view your own profile');
        }
        return getUserById(req, res);
    })
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Owner or Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden
 */
router.put('/:id',
    validate(updateUserSchema),
    requireAnyPermission([Permission.UPDATE_OWN_PROFILE, Permission.MANAGE_USERS]),
    asyncHandler(async (req: Request, res: Response) => {
        // Check ownership or admin
        if (req.user!.id !== req.params.id && !req.user!.permissions.includes(Permission.MANAGE_USERS)) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own profile');
        }
        return updateUser(req, res);
    })
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Owner or Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete('/:id',
    validate(userIdParamSchema),
    requireAnyPermission([Permission.MANAGE_USERS, Permission.UPDATE_OWN_PROFILE]),
    asyncHandler(async (req: Request, res: Response) => {
        // Check ownership or admin
        if (req.user!.id !== req.params.id && !req.user!.permissions.includes(Permission.MANAGE_USERS)) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own account');
        }
        return deleteUser(req, res);
    })
);

export default router;
