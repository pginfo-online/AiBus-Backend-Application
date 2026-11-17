import { Router } from "express";
import { UsersController } from "./users.controller";
import { z } from "zod";
import { validate } from "../../app/middleware/validation";
import {
  passengerSchema,
  passengerParamsSchema,
  profileSchema,
} from "./users.validation";
import { PassengersService } from "./passengers.service";
import { ApiResponse } from "../../shared/utils/response";
import { authenticate } from "../../app/middleware";

const usersRouter = Router();
const controller = new UsersController();

usersRouter.use(authenticate);

usersRouter.get("/profile", controller.getProfile);
usersRouter.patch(
  "/profile",
  validate({ body: profileSchema }),
  controller.updateProfile,
);
usersRouter.get("/wallet", controller.getWallet);

const passengers = new PassengersService();
usersRouter.get(
  "/passengers",
  validate({ query: z.object({}).strict() }),
  async (req, res, next) => {
    try {
      ApiResponse.success(
        res,
        await passengers.list(req.user!.sub),
        "Passengers retrieved",
      );
    } catch (error) {
      next(error);
    }
  },
);
usersRouter.post(
  "/passengers",
  validate({ body: passengerSchema }),
  async (req, res, next) => {
    try {
      const key = req.get("Idempotency-Key");
      if (key && !z.string().uuid().safeParse(key).success) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid Idempotency-Key",
          },
        });
        return;
      }
      ApiResponse.success(
        res,
        await passengers.save(req.user!.sub, req.body, undefined, key),
        "Passenger added",
      );
    } catch (error) {
      next(error);
    }
  },
);
usersRouter.patch(
  "/passengers/:id",
  validate({ params: passengerParamsSchema, body: passengerSchema }),
  async (req, res, next) => {
    try {
      ApiResponse.success(
        res,
        await passengers.save(req.user!.sub, req.body, String(req.params.id)),
        "Passenger updated",
      );
    } catch (error) {
      next(error);
    }
  },
);

export { usersRouter };
export default usersRouter;
