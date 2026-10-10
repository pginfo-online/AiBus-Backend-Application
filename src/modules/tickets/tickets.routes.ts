import { Router } from 'express';
import { TicketsController } from './tickets.controller';
import { optionalAuth } from '../../app/middleware';

const ticketsRouter = Router();
const controller = new TicketsController();

ticketsRouter.get('/gds-details', optionalAuth, controller.getGdsBookingDetails);
ticketsRouter.post('/gds-details', optionalAuth, controller.getGdsBookingDetails);
ticketsRouter.get('/booking/:bookingId', optionalAuth, controller.getTicketByBookingId);
ticketsRouter.get('/number/:ticketNumber', optionalAuth, controller.getTicketByTicketNumber);

export { ticketsRouter };
export default ticketsRouter;
