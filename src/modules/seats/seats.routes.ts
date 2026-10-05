import { Router } from 'express';
import { SeatsController } from './seats.controller';

const seatsRouter = Router();
const controller = new SeatsController();

seatsRouter.get('/:busId/chart', controller.getSeatChart);

export { seatsRouter };
export default seatsRouter;
