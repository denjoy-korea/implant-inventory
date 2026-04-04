import {
  createPlanPaymentProductDescriptor,
  createServicePurchaseProductDescriptor,
  parsePaymentProductDescriptor,
  type PaymentProductDescriptor,
} from './paymentProducts';

export type PaymentMetadataKind = 'plan_payment' | 'service_purchase';

export interface ServicePurchaseMetadataItem {
  id: string;
  name: string;
  price: number;
}

export interface PaymentMetadataBase {
  version: 1;
  kind: PaymentMetadataKind;
  product: PaymentProductDescriptor;
  orderName: string;
  summary: string;
  payableAmount: number;
}

export interface PlanPaymentMetadata extends PaymentMetadataBase {
  kind: 'plan_payment';
  plan: string;
  billingCycle: string;
  baseAmount: number;
  couponDiscountAmount: number;
  upgradeCreditAmount: number;
  creditUsedAmount: number;
  couponId: string | null;
}

export interface ServicePurchasePaymentMetadata extends PaymentMetadataBase {
  kind: 'service_purchase';
  items: ServicePurchaseMetadataItem[];
}

export type PaymentMetadata = PlanPaymentMetadata | ServicePurchasePaymentMetadata;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeServicePurchaseItems(value: unknown): ServicePurchaseMetadataItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      return [];
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      return [];
    }

    return [{
      id: item.id,
      name: item.name,
      price,
    }];
  });
}

function parseLegacyServicePurchaseMetadata(parsed: unknown): ServicePurchasePaymentMetadata | null {
  const items = normalizeServicePurchaseItems(parsed);
  if (items.length === 0) return null;

  return {
    version: 1,
    kind: 'service_purchase',
    product: createServicePurchaseProductDescriptor(buildServicePurchaseOrderName(items)),
    orderName: buildServicePurchaseOrderName(items),
    summary: buildServicePurchaseOrderName(items),
    payableAmount: Math.round(items.reduce((sum, item) => sum + item.price, 0) * 1.1),
    items,
  };
}

export function buildServicePurchaseOrderName(items: ServicePurchaseMetadataItem[]): string {
  if (items.length === 0) return '서비스 구매';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} 외 ${items.length - 1}건`;
}

export function createPlanPaymentMetadata(params: {
  orderName: string;
  payableAmount: number;
  plan: string;
  billingCycle: string;
  baseAmount: number;
  couponDiscountAmount: number;
  upgradeCreditAmount: number;
  creditUsedAmount: number;
  couponId?: string | null;
}): PlanPaymentMetadata {
  return {
    version: 1,
    kind: 'plan_payment',
    product: createPlanPaymentProductDescriptor(params.plan, params.billingCycle, params.orderName),
    orderName: params.orderName,
    summary: params.orderName,
    payableAmount: params.payableAmount,
    plan: params.plan,
    billingCycle: params.billingCycle,
    baseAmount: params.baseAmount,
    couponDiscountAmount: params.couponDiscountAmount,
    upgradeCreditAmount: params.upgradeCreditAmount,
    creditUsedAmount: params.creditUsedAmount,
    couponId: params.couponId ?? null,
  };
}

export function createServicePurchasePaymentMetadata(params: {
  orderName: string;
  payableAmount: number;
  items: ServicePurchaseMetadataItem[];
}): ServicePurchasePaymentMetadata {
  return {
    version: 1,
    kind: 'service_purchase',
    product: createServicePurchaseProductDescriptor(params.orderName),
    orderName: params.orderName,
    summary: params.orderName,
    payableAmount: params.payableAmount,
    items: params.items,
  };
}

export function serializePaymentMetadata(metadata: PaymentMetadata): string {
  return JSON.stringify(metadata);
}

export function parsePaymentMetadata(description: string | null | undefined): PaymentMetadata | null {
  if (!description) return null;

  const parsed = parseJson(description);
  if (Array.isArray(parsed)) {
    return parseLegacyServicePurchaseMetadata(parsed);
  }
  if (!isObject(parsed) || parsed.version !== 1 || typeof parsed.kind !== 'string') {
    return null;
  }
  if (typeof parsed.orderName !== 'string' || typeof parsed.summary !== 'string' || !isFiniteNonNegativeNumber(parsed.payableAmount)) {
    return null;
  }

  if (parsed.kind === 'plan_payment') {
    if (
      typeof parsed.plan !== 'string' ||
      typeof parsed.billingCycle !== 'string' ||
      !isFiniteNonNegativeNumber(parsed.baseAmount) ||
      !isFiniteNonNegativeNumber(parsed.couponDiscountAmount) ||
      !isFiniteNonNegativeNumber(parsed.upgradeCreditAmount) ||
      !isFiniteNonNegativeNumber(parsed.creditUsedAmount)
    ) {
      return null;
    }

    const product = parsePaymentProductDescriptor(parsed.product)
      ?? createPlanPaymentProductDescriptor(parsed.plan, parsed.billingCycle, parsed.orderName);

    return {
      version: 1,
      kind: 'plan_payment',
      product,
      orderName: parsed.orderName,
      summary: parsed.summary,
      payableAmount: parsed.payableAmount,
      plan: parsed.plan,
      billingCycle: parsed.billingCycle,
      baseAmount: parsed.baseAmount,
      couponDiscountAmount: parsed.couponDiscountAmount,
      upgradeCreditAmount: parsed.upgradeCreditAmount,
      creditUsedAmount: parsed.creditUsedAmount,
      couponId: typeof parsed.couponId === 'string' ? parsed.couponId : null,
    };
  }

  if (parsed.kind === 'service_purchase') {
    const items = normalizeServicePurchaseItems(parsed.items);
    if (items.length === 0) return null;
    const product = parsePaymentProductDescriptor(parsed.product)
      ?? createServicePurchaseProductDescriptor(parsed.orderName);

    return {
      version: 1,
      kind: 'service_purchase',
      product,
      orderName: parsed.orderName,
      summary: parsed.summary,
      payableAmount: parsed.payableAmount,
      items,
    };
  }

  return null;
}

export function extractServicePurchaseItems(description: string | null | undefined): ServicePurchaseMetadataItem[] {
  const metadata = parsePaymentMetadata(description);
  if (!metadata || metadata.kind !== 'service_purchase') {
    return [];
  }
  return metadata.items;
}

export function getPaymentDescriptionDisplayText(description: string | null | undefined): string | null {
  if (!description) return null;

  const metadata = parsePaymentMetadata(description);
  if (metadata) {
    return metadata.summary;
  }

  return description;
}
