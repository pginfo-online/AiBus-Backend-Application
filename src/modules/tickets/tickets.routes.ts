import { Router } from 'express';
import { TicketsController } from './tickets.controller';
import { optionalAuth } from '../../app/middleware';

const ticketsRouter = Router();
const controller = new TicketsController();

ticketsRouter.get('/gds-details', optionalAuth, controller.getGdsBookingDetails);
ticketsRouter.post('/gds-details', optionalAuth, controller.getGdsBookingDetails);
ticketsRouter.get('/booking/:bookingId', optionalAuth, controller.getTicketByBookingId);
ticketsRouter.get('/booking/:bookingId/pdf', optionalAuth, controller.downloadTicketPdf);
ticketsRouter.get('/number/:ticketNumber', optionalAuth, controller.getTicketByTicketNumber);
ticketsRouter.get('/:id/pdf', optionalAuth, controller.downloadTicketPdf);

export { ticketsRouter };
export default ticketsRouter;
