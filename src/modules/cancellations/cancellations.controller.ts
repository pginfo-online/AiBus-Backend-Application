import { Request, Response, NextFunction } from "express";
import { CancellationsService } from "./cancellations.service";
import { GdsAdapter } from "../../providers/gds/gdsAdapter";
import { ApiResponse, sendSuccess } from "../../shared/utils/response";

export class CancellationsController {
  private cancellationsService: CancellationsService;
  private gdsAdapter: GdsAdapter;

  constructor() {
    this.cancellationsService = CancellationsService.getInstance();
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public checkCancellability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const bookingId = Array.isArray(req.params.bookingId)
        ? req.params.bookingId[0]
        : req.params.bookingId;
      const seatNos = req.query.seatNos
        ? (req.query.seatNos as string).split(",")
        : undefined;
      const result = await this.cancellationsService.checkCancellability(
        bookingId,
        seatNos,
        (req as any).user?.sub,
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public cancelSeats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const bookingId = Array.isArray(req.params.bookingId)
        ? req.params.bookingId[0]
        : req.params.bookingId;
      const rawSeatNos =
        req.body?.seatNos || req.body?.SeatNos || req.body?.seats;
      const seatNos = Array.isArray(rawSeatNos)
        ? rawSeatNos
        : typeof rawSeatNos === "string"
          ? rawSeatNos.split(",")
          : [];
      const reason = req.body?.reason;
      const refundToWallet = req.body?.refundToWallet === true;
      const userId = (req as any).user?.sub;

      const result = await this.cancellationsService.cancelSeats(
        bookingId,
        seatNos,
        reason,
        userId,
        refundToWallet,
      );
      sendSuccess(res, { data: result, statusCode: result.cancellation.status === 'COMPLETED' ? 200 : 202 });
    } catch (error) {
      next(error);
    }
  };

  public checkDirectCancellability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ticketNo = String(req.query.TicketNo || req.query.ticketNo || "");
      const seatNos = String(req.query.SeatNos || req.query.seatNos || "");
      const pnrNo = req.query.PNRNo || req.query.pnrNo || req.query.PNR ? String(req.query.PNRNo || req.query.pnrNo || req.query.PNR) : undefined;

      const result = await this.gdsAdapter.isCancellable(ticketNo, seatNos, pnrNo);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public cancelDirectSeats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ticketNo = String(req.body.TicketNo || req.body.ticketNo || "");
      const seatNos = String(req.body.SeatNos || req.body.seatNos || "");
      const pnr = req.body.PNR || req.body.PNRNo || req.body.pnr ? String(req.body.PNR || req.body.PNRNo || req.body.pnr) : undefined;

      const result = await this.gdsAdapter.cancelSeats({
        TicketNo: ticketNo,
        SeatNos: seatNos,
        PNR: pnr,
      });
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public getAgentBalance = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.gdsAdapter.getBalance();
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
