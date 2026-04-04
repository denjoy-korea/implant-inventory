import { describe, expect, it } from 'vitest';
import {
  createPlanPaymentMetadata,
  createServicePurchasePaymentMetadata,
  extractServicePurchaseItems,
  parsePaymentMetadata,
  serializePaymentMetadata,
} from '../../utils/paymentMetadata';

describe('paymentMetadata', () => {
  it('신규 플랜 메타데이터에 상품 descriptor를 포함한다', () => {
    const metadata = createPlanPaymentMetadata({
      orderName: 'Plus 연간 구독',
      payableAmount: 62040,
      plan: 'plus',
      billingCycle: 'yearly',
      baseAmount: 56400,
      couponDiscountAmount: 0,
      upgradeCreditAmount: 0,
      creditUsedAmount: 0,
    });

    expect(metadata.product).toEqual({
      kind: 'plan_subscription',
      code: 'plan:plus:yearly',
      title: 'Plus 연간 구독',
    });
  });

  it('레거시 서비스 배열 description도 계속 파싱한다', () => {
    const description = JSON.stringify([
      { id: 'course-1', name: '임플란트 재고관리', price: 99000 },
    ]);

    const parsed = parsePaymentMetadata(description);

    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe('service_purchase');
    expect(parsed?.product.kind).toBe('service_purchase');
    expect(parsed?.product.code).toBe('service_purchase');
    expect(parsed?.product.title).toBe('임플란트 재고관리');
  });

  it('신규 서비스 메타데이터를 직렬화 후 다시 읽으면 상품 descriptor를 유지한다', () => {
    const raw = serializePaymentMetadata(createServicePurchasePaymentMetadata({
      orderName: '강의 패키지 2건',
      payableAmount: 217800,
      items: [
        { id: 'course-1', name: 'A 강의', price: 99000 },
        { id: 'course-2', name: 'B 강의', price: 99000 },
      ],
    }));

    const parsed = parsePaymentMetadata(raw);

    expect(parsed?.kind).toBe('service_purchase');
    expect(parsed?.product).toEqual({
      kind: 'service_purchase',
      code: 'service_purchase',
      title: '강의 패키지 2건',
    });
    expect(extractServicePurchaseItems(raw)).toHaveLength(2);
  });
});
