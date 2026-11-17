import { describe, expect, it } from 'vitest';
import { cancellationRefund, splitRefund } from '../../src/modules/cancellations/refundMath';
import { paymentOutcome, remainingPaymentStatus } from '../../src/modules/bookings/bookingOutcome';

describe('booking financial and status boundaries', () => {
  it('deducts the proportional coupon benefit and actual operator charge on partial cancellation', () => {
    expect(cancellationRefund({ grossTotal: 200, selectedGross: 100, paidTotal: 180, operatorRefund: 90, refunded: 0 })).toBe(80);
    expect(cancellationRefund({ grossTotal: 200, selectedGross: 100, paidTotal: 180, operatorRefund: 90, refunded: 80 })).toBe(80);
  });
  it('never refunds more than the remaining paid amount or a negative amount', () => {
    expect(cancellationRefund({ grossTotal: 100, selectedGross: 100, paidTotal: 60, operatorRefund: 80, refunded: 55 })).toBe(5);
    expect(cancellationRefund({ grossTotal: 100, selectedGross: 100, paidTotal: 60, operatorRefund: 10, refunded: 0 })).toBe(0);
    expect(() => cancellationRefund({ grossTotal: 100, selectedGross: 100, paidTotal: 100, operatorRefund: NaN, refunded: 0 })).toThrow();
  });
  it('returns wallet funds first and caps the gateway portion', () => {
    expect(splitRefund(80, 50, 130)).toEqual({ wallet: 50, gateway: 30 });
    expect(splitRefund(80, 0, 100)).toEqual({ wallet: 0, gateway: 80 });
    expect(() => splitRefund(150, 10, 100)).toThrow();
  });
  it('reports confirmation and payment states separately', () => {
    expect(paymentOutcome('BOOKING_REQUESTED', 'SUCCESS')).toBe('PENDING');
    expect(paymentOutcome('BOOKING_UNKNOWN', 'SUCCESS')).toBe('BOOKING_UNKNOWN');
    expect(paymentOutcome('CONFIRMED', 'SUCCESS')).toBe('SUCCESS');
    expect(paymentOutcome('BOOKING_FAILED', 'SUCCESS')).toBe('BOOKING_FAILED');
    expect(remainingPaymentStatus(100, 40)).toBe('PARTIALLY_REFUNDED');
    expect(remainingPaymentStatus(100, 100)).toBe('REFUNDED');
  });
});
