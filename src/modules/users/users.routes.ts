import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../app/middleware';

const usersRouter = Router();
const controller = new UsersController();

usersRouter.use(authenticate);

usersRouter.get('/profile', controller.getProfile);
usersRouter.patch('/profile', controller.updateProfile);

export { usersRouter };
export default usersRouter;
