import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DreamzSmsProvider } from '../../src/providers/sms/dreamzSms.provider';
import { AuthService } from '../../src/modules/auth/auth.service';
import { getPrismaClient } from '../../src/infrastructure/database';
import { UserRole, UserStatus } from '@prisma/client';

describe('DreamzSmsProvider Unit Tests', () => {
  const provider = DreamzSmsProvider.getInstance();

  it('formats DLT template message accurately with OTP and app hash', () => {
    const formatted = provider.formatMessage('1234', 'AbCdEfGhIjK');
    expect(formatted).toBe(
      '<#> Dear User, PGInfo login verification code is 1234. Valid for 5 minutes. Do not share. AbCdEfGhIjK'
    );
  });

  it('uses default app hash when none is provided', () => {
    const formatted = provider.formatMessage('582914');
    expect(formatted).toContain('582914');
    expect(formatted).toContain('<#> Dear User, PGInfo login verification code is 582914.');
    expect(formatted).toContain('AbCdEfGhIjK');
  });

  it('rejects invalid phone numbers before calling gateway', async () => {
    await expect(
      provider.sendOtp({ to: '1234', otp: '1234' })
    ).rejects.toThrow('A valid 10-digit mobile number is required');
  });

  it('simulates SMS sending in test environment without throwing', async () => {
    const result = await provider.sendOtp({
      to: '8010097706',
      otp: '1234',
      appHash: 'AbCdEfGhIjK',
    });
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });
});

describe('AuthService OTP Fast Onboarding Tests', () => {
  const authService = AuthService.getInstance();
  const getRandomPhone = () => `9${Math.floor(100000000 + Math.random() * 900000000)}`;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends OTP successfully and returns countdown metadata', async () => {
    const testPhone = getRandomPhone();
    const result = await authService.sendOtp({
      phone: testPhone,
      appHash: 'AbCdEfGhIjK',
    });

    expect(result.phone).toBe(testPhone);
    expect(result.expiresInSeconds).toBe(300);
    expect(result.resendCooldownSeconds).toBe(30);
    expect(result.otpLength).toBeGreaterThanOrEqual(4);
    expect(result.debugOtp).toBeDefined();
  });

  it('enforces 30s resend cooldown to protect against spam', async () => {
    const testPhone = getRandomPhone();
    await authService.sendOtp({ phone: testPhone });

    // Immediate second send should trigger cooldown error
    await expect(
      authService.sendOtp({ phone: testPhone })
    ).rejects.toThrow(/Please wait/);
  });

  it('fails verification for wrong OTP and shows remaining attempts', async () => {
    const freshPhone = getRandomPhone();
    await authService.sendOtp({ phone: freshPhone });

    await expect(
      authService.verifyOtp({ phone: freshPhone, otp: '000000' })
    ).rejects.toThrow(/Invalid verification code. 4 attempts remaining/);
  });

  it('fails verification for non-existent or expired OTP', async () => {
    await expect(
      authService.verifyOtp({ phone: getRandomPhone(), otp: '123456' })
    ).rejects.toThrow(/OTP has expired or was not requested/);
  });

  it('verifies valid OTP, onboards new user and returns JWT token pair', async () => {
    const newUserPhone = getRandomPhone();
    const otpRes = await authService.sendOtp({ phone: newUserPhone });
    const otp = otpRes.debugOtp!;

    const result = await authService.verifyOtp({
      phone: newUserPhone,
      otp,
      firstName: 'Aarav',
      lastName: 'Patel',
    });

    expect(result.isNewUser).toBe(true);
    expect(result.user.phone).toBe(newUserPhone);
    expect(result.user.firstName).toBe('Aarav');
    expect(result.user.lastName).toBe('Patel');
    expect(result.user.phoneVerified).toBe(true);
    expect(result.user.role).toBe(UserRole.CUSTOMER);
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();

    // Replay attack prevention: trying same OTP again must fail immediately
    await expect(
      authService.verifyOtp({ phone: newUserPhone, otp })
    ).rejects.toThrow(/OTP has expired or was not requested/);
  }, 15000);

  it('authenticates existing user without creating duplicates', async () => {
    const existingPhone = getRandomPhone();
    // First verification (creates user)
    const send1 = await authService.sendOtp({ phone: existingPhone });
    const verify1 = await authService.verifyOtp({
      phone: existingPhone,
      otp: send1.debugOtp!,
    });
    expect(verify1.isNewUser).toBe(true);
    const originalUserId = verify1.user.id;

    // Reset cooldown in memory for test
    (authService as any).memoryCooldownStore.delete(existingPhone);

    // Second login with OTP
    const send2 = await authService.sendOtp({ phone: existingPhone });
    const verify2 = await authService.verifyOtp({
      phone: existingPhone,
      otp: send2.debugOtp!,
    });

    expect(verify2.isNewUser).toBe(false);
    expect(verify2.user.id).toBe(originalUserId);
    expect(verify2.tokens.accessToken).toBeDefined();
  }, 15000);
});
