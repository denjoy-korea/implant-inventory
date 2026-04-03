import { describe, expect, it } from 'vitest';
import { isHospitalServiceSubscriptionActive, type HospitalServiceSubscription } from '@/types';

function makeSubscription(
  overrides: Partial<HospitalServiceSubscription> = {},
): HospitalServiceSubscription {
  return {
    id: 'sub-1',
    hospitalId: 'hospital-1',
    serviceCode: 'implant_inventory',
    status: 'active',
    servicePlanCode: 'business',
    billingCycle: 'monthly',
    seatCount: 1,
    startedAt: '2026-04-01T00:00:00.000Z',
    currentPeriodStart: '2026-04-01T00:00:00.000Z',
    currentPeriodEnd: null,
    cancelledAt: null,
    sourceBillingId: null,
    metadata: {},
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isHospitalServiceSubscriptionActive', () => {
  it('active + 기간 무제한이면 true', () => {
    expect(isHospitalServiceSubscriptionActive(makeSubscription())).toBe(true);
  });

  it('trialing + 미래 만료일이면 true', () => {
    const now = new Date('2026-04-03T00:00:00.000Z');
    expect(isHospitalServiceSubscriptionActive(
      makeSubscription({
        status: 'trialing',
        currentPeriodEnd: '2026-04-10T00:00:00.000Z',
      }),
      now,
    )).toBe(true);
  });

  it('active 여도 만료일이 지났으면 false', () => {
    const now = new Date('2026-04-03T00:00:00.000Z');
    expect(isHospitalServiceSubscriptionActive(
      makeSubscription({
        currentPeriodEnd: '2026-04-02T23:59:59.000Z',
      }),
      now,
    )).toBe(false);
  });

  it('cancelled 상태면 false', () => {
    expect(isHospitalServiceSubscriptionActive(
      makeSubscription({ status: 'cancelled' }),
    )).toBe(false);
  });
});
