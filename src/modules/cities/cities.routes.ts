import { Router } from 'express';
import { CitiesController } from './cities.controller';
import { authenticate, authorize } from '../../app/middleware';
import { UserRole } from '@prisma/client';

const citiesRouter = Router();
const controller = new CitiesController();

// Public: get cities list
citiesRouter.get('/', controller.getCities);

// Admin only: trigger provider sync
citiesRouter.post('/sync', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), controller.syncCities);

export { citiesRouter };
export default citiesRouter;
