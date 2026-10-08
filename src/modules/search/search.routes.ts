import { Router } from 'express';
import { SearchController } from './search.controller';
import { validate } from '../../app/middleware';
import { searchBusesSchema, searchSingleBusSchema } from './search.validation';

const searchRouter = Router();
const controller = new SearchController();

searchRouter.get('/bus', validate({ query: searchSingleBusSchema }), controller.searchSingleBus);
searchRouter.get('/', validate({ query: searchBusesSchema }), controller.searchBuses);

export { searchRouter };
export default searchRouter;
