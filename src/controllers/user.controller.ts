import type { Request, Response } from "express";
import * as userService from "../services/user.service";
import httpStatus from "../constants/httpStatus";

export async function getUserById(request: Request, response: Response) {
    const user = await userService.getUserById(request.params.id);
    response.json(user);
}

export async function getUsers(_request: Request, response: Response) {
    const users = await userService.getAllUsers();
    response.json(users);
}

/**
 * Update user
 */
export async function updateUser(request: Request, response: Response) {
    const user = await userService.updateUser(request.params.id, request.body);
    response.status(httpStatus.OK).json(user);
}

/**
 * Delete user
 */
export async function deleteUser(request: Request, response: Response) {
    await userService.deleteUser(request.params.id);
    response.status(httpStatus.OK).json({ message: 'User deleted successfully' });
}
