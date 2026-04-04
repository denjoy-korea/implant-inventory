export type PaymentProductDescriptorKind = 'plan_subscription' | 'service_purchase';

export interface PaymentProductDescriptor {
  kind: PaymentProductDescriptorKind;
  code: string;
  title: string;
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDescriptorKind(value: unknown): value is PaymentProductDescriptorKind {
  return value === 'plan_subscription' || value === 'service_purchase';
}

export function createPlanPaymentProductDescriptor(
  plan: string,
  billingCycle: string,
  orderName: string,
): PaymentProductDescriptor {
  return {
    kind: 'plan_subscription',
    code: `plan:${plan}:${billingCycle}`,
    title: orderName,
  };
}

export function createServicePurchaseProductDescriptor(
  orderName: string,
): PaymentProductDescriptor {
  return {
    kind: 'service_purchase',
    code: 'service_purchase',
    title: orderName,
  };
}

export function parsePaymentProductDescriptor(value: unknown): PaymentProductDescriptor | null {
  if (!isObject(value) || !isDescriptorKind(value.kind)) {
    return null;
  }

  const code = normalizeText(typeof value.code === 'string' ? value.code : null);
  const title = normalizeText(typeof value.title === 'string' ? value.title : null);

  if (!code || !title) {
    return null;
  }

  return {
    kind: value.kind,
    code,
    title,
  };
}
