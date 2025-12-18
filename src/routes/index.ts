import Router from "express";
import userRouter from "./user.route";
import authRouter from "./auth.route";

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);

export default router;