import { Router } from 'express';
import { HoldsController } from './holds.controller';
import { validate, optionalAuth } from '../../app/middleware';
import { holdSeatsSchema } from './holds.validation';

const holdsRouter = Router();
const controller = new HoldsController();

// Optional auth allows both guests and authenticated users to hold seats
holdsRouter.post('/', optionalAuth, validate({ body: holdSeatsSchema }), controller.holdSeats);
holdsRouter.get('/:id', controller.getHold);

export { holdsRouter };
export default holdsRouter;
