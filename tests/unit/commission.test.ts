import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCommission } from '../../src/infrastructure/commission';
import { getPrismaClient } from '../../src/infrastructure/database';
import { CommissionRuleType } from '@prisma/client';

// Mock database
vi.mock('../../src/infrastructure/database', () => {
  const mockFindMany = vi.fn();
  return {
    getPrismaClient: () => ({
      commissionRule: {
        findMany: mockFindMany,
      },
    }),
  };
});

describe('CommissionEngine Priority & Resolution Rules', () => {
  const prismaMock = getPrismaClient() as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve percentage commission on baseFare (excluding tax)', async () => {
    prismaMock.commissionRule.findMany.mockResolvedValueOnce([
      {
        id: 'rule-global-default',
        name: 'Global 10%',
        ruleType: CommissionRuleType.FLAT_PERCENTAGE,
        agentId: null,
        operatorName: null,
        fromCityId: null,
        toCityId: null,
        percentage: 10,
        flatAmount: null,
        minFare: null,
        maxCommission: null,
        priority: 10,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);

    const result = await resolveCommission({
      agentId: 'agent-123',
      grossFare: 1100, // Total fare including tax
      baseFare: 1000,  // Base fare tax-excluded
      journeyDate: '2026-10-20',
    });

    expect(result.ruleId).toBe('rule-global-default');
    expect(result.commissionRate).toBe(10);
    // 10% of 1000 = 100
    expect(result.commissionAmt).toBe(100);
    // Net fare: 1100 - 100 = 1000
    expect(result.netFare).toBe(1000);
  });

  it('should select higher priority operator-specific rule over global rule', async () => {
    prismaMock.commissionRule.findMany.mockResolvedValueOnce([
      {
        id: 'rule-operator-premium',
        name: 'Kallada Travels 12%',
        ruleType: CommissionRuleType.OPERATOR_SPECIFIC,
        agentId: null,
        operatorName: 'Kallada Travels',
        fromCityId: null,
        toCityId: null,
        percentage: 12,
        flatAmount: null,
        minFare: null,
        maxCommission: null,
        priority: 50, // Higher priority
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
      {
        id: 'rule-global-flat',
        name: 'Global 8%',
        ruleType: CommissionRuleType.FLAT_PERCENTAGE,
        agentId: null,
        operatorName: null,
        fromCityId: null,
        toCityId: null,
        percentage: 8,
        flatAmount: null,
        minFare: null,
        maxCommission: null,
        priority: 10,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);

    const result = await resolveCommission({
      agentId: 'agent-123',
      operatorName: 'Kallada Travels',
      grossFare: 2200,
      baseFare: 2000,
      journeyDate: '2026-10-20',
    });

    expect(result.ruleId).toBe('rule-operator-premium');
    expect(result.commissionAmt).toBe(240); // 12% of 2000
    expect(result.netFare).toBe(1960);      // 2200 - 240
  });

  it('should enforce maxCommission cap', async () => {
    prismaMock.commissionRule.findMany.mockResolvedValueOnce([
      {
        id: 'rule-capped',
        name: 'High percentage with cap',
        ruleType: CommissionRuleType.FLAT_PERCENTAGE,
        agentId: null,
        operatorName: null,
        fromCityId: null,
        toCityId: null,
        percentage: 20, // 20% of 3000 would be 600
        flatAmount: null,
        minFare: null,
        maxCommission: 250, // Capped at 250
        priority: 20,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);

    const result = await resolveCommission({
      agentId: 'agent-123',
      grossFare: 3300,
      baseFare: 3000,
      journeyDate: '2026-10-20',
    });

    expect(result.commissionAmt).toBe(250); // Capped at 250
    expect(result.netFare).toBe(3050);      // 3300 - 250
  });

  it('should skip rule when grossFare is below minFare threshold', async () => {
    prismaMock.commissionRule.findMany.mockResolvedValueOnce([
      {
        id: 'rule-high-value-only',
        name: 'VIP routes above 1500 only',
        ruleType: CommissionRuleType.FLAT_PERCENTAGE,
        agentId: null,
        operatorName: null,
        fromCityId: null,
        toCityId: null,
        percentage: 15,
        flatAmount: null,
        minFare: 1500, // Fare floor
        maxCommission: null,
        priority: 50,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
      {
        id: 'rule-fallback',
        name: 'Default 5%',
        ruleType: CommissionRuleType.FLAT_PERCENTAGE,
        agentId: null,
        operatorName: null,
        fromCityId: null,
        toCityId: null,
        percentage: 5,
        flatAmount: null,
        minFare: null,
        maxCommission: null,
        priority: 10,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);

    const result = await resolveCommission({
      agentId: 'agent-123',
      grossFare: 800, // Below minFare 1500
      baseFare: 750,
      journeyDate: '2026-10-20',
    });

    // Should skip the first rule and match fallback
    expect(result.ruleId).toBe('rule-fallback');
    expect(result.commissionAmt).toBe(37.5); // 5% of 750
  });

  it('should support FLAT_AMOUNT rule', async () => {
    prismaMock.commissionRule.findMany.mockResolvedValueOnce([
      {
        id: 'rule-flat-amount',
        name: 'Flat Rs 50',
        ruleType: CommissionRuleType.FLAT_AMOUNT,
        agentId: null,
        operatorName: null,
        fromCityId: null,
        toCityId: null,
        percentage: null,
        flatAmount: 50,
        minFare: null,
        maxCommission: null,
        priority: 30,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);

    const result = await resolveCommission({
      agentId: 'agent-123',
      grossFare: 600,
      baseFare: 550,
      journeyDate: '2026-10-20',
    });

    expect(result.commissionAmt).toBe(50);
    expect(result.netFare).toBe(550); // 600 - 50
  });

  it('should return 0 commission when no rules match candidate filters', async () => {
    prismaMock.commissionRule.findMany.mockResolvedValueOnce([]);

    const result = await resolveCommission({
      agentId: 'agent-orphan',
      grossFare: 1500,
      baseFare: 1400,
      journeyDate: '2026-10-20',
    });

    expect(result.ruleId).toBeNull();
    expect(result.commissionAmt).toBe(0);
    expect(result.commissionRate).toBe(0);
    expect(result.netFare).toBe(1500);
  });
});
