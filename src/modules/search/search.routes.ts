import { Router } from 'express';
import { SearchController } from './search.controller';
import { validate } from '../../app/middleware';
import { searchBusesSchema } from './search.validation';

const searchRouter = Router();
const controller = new SearchController();

searchRouter.get('/', validate({ query: searchBusesSchema }), controller.searchBuses);

export { searchRouter };
export default searchRouter;
