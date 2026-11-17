import { CouponsService } from '../coupons/coupons.service';
import { getPrismaClient } from "../../infrastructure/database";

export async function expireUnpaidCheckout(bookingId: string) {
  const db = getPrismaClient();
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId}::uuid FOR UPDATE`;
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { holds: true, payments: true },
    });
    if (
      !booking ||
      !["HELD", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(booking.status) ||
      booking.payments.some((p) =>
        ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status),
      ) ||
      booking.holds.some((h) => h.expiresAt.getTime() > Date.now() - 90000)
    )
      return;
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "HOLD_EXPIRED", version: { increment: 1 } },
    });
    await CouponsService.getInstance().releaseCheckoutCoupon(bookingId, tx);
    if (
      !booking.agentId &&
      booking.userId &&
      Number(booking.walletAmount) > 0
    ) {
      const key = `booking-wallet-failure:${bookingId}`;
      if (await tx.refund.findUnique({ where: { idempotencyKey: key } }))
        return;
      const amount = Number(booking.walletAmount);
      const user = await tx.user.update({
        where: { id: booking.userId },
        data: { walletBalance: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: booking.userId,
          type: "REFUND",
          amount,
          balanceAfter: user.walletBalance,
          referenceType: "HOLD_EXPIRED",
          referenceId: booking.id,
          description: "Unused wallet reservation returned",
        },
      });
      await tx.refund.create({
        data: {
          bookingId,
          userId: booking.userId,
          amount,
          status: "COMPLETED",
          destination: "WALLET",
          completedAt: new Date(),
          reason: "Checkout expired before payment capture",
          idempotencyKey: key,
        },
      });
    }
  });
}
