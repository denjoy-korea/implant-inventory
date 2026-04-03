import type { BillingCycle } from './plan';

export type PlatformServiceCode =
  | 'hospital_homepage'
  | 'implant_inventory'
  | 'hr'
  | 'consulting'
  | 'insurance_claims'
  | 'lectures';

export type ServiceSubjectType = 'hospital' | 'user';
export type ServiceBusinessModel = 'b2b' | 'b2c';

export type HospitalScopedServiceCode =
  | 'hospital_homepage'
  | 'implant_inventory'
  | 'hr'
  | 'consulting'
  | 'insurance_claims';

export type HospitalServiceSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export interface ServiceCatalogItem {
  code: PlatformServiceCode;
  displayName: string;
  subjectType: ServiceSubjectType;
  businessModel: ServiceBusinessModel;
  sortOrder: number;
  isActive: boolean;
}

export interface HospitalServiceSubscription {
  id: string;
  hospitalId: string;
  serviceCode: HospitalScopedServiceCode;
  status: HospitalServiceSubscriptionStatus;
  servicePlanCode: string | null;
  billingCycle: BillingCycle | null;
  seatCount: number;
  startedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  sourceBillingId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalServiceMatrixItem extends ServiceCatalogItem {
  serviceCode: HospitalScopedServiceCode;
  hasAccess: boolean;
  subscription: HospitalServiceSubscription | null;
}

export const PLATFORM_SERVICE_LABELS: Record<PlatformServiceCode, string> = {
  hospital_homepage: '홈페이지',
  implant_inventory: '임플란트 재고관리',
  hr: 'HR',
  consulting: '상담',
  insurance_claims: '보험청구',
  lectures: '강의',
};

export const HOSPITAL_SCOPED_SERVICE_CODES = [
  'hospital_homepage',
  'implant_inventory',
  'hr',
  'consulting',
  'insurance_claims',
] as const satisfies readonly HospitalScopedServiceCode[];

export const DEFAULT_SERVICE_CATALOG: ServiceCatalogItem[] = [
  { code: 'hospital_homepage', displayName: '홈페이지', subjectType: 'hospital', businessModel: 'b2b', sortOrder: 10, isActive: true },
  { code: 'implant_inventory', displayName: '임플란트 재고관리', subjectType: 'hospital', businessModel: 'b2b', sortOrder: 20, isActive: true },
  { code: 'hr', displayName: 'HR', subjectType: 'hospital', businessModel: 'b2b', sortOrder: 30, isActive: true },
  { code: 'consulting', displayName: '상담', subjectType: 'hospital', businessModel: 'b2b', sortOrder: 40, isActive: true },
  { code: 'insurance_claims', displayName: '보험청구', subjectType: 'hospital', businessModel: 'b2b', sortOrder: 50, isActive: true },
  { code: 'lectures', displayName: '강의', subjectType: 'user', businessModel: 'b2c', sortOrder: 900, isActive: true },
];

export function isHospitalServiceSubscriptionActive(
  subscription: Pick<HospitalServiceSubscription, 'status' | 'currentPeriodEnd'>,
  now: Date = new Date(),
): boolean {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false;
  }

  if (!subscription.currentPeriodEnd) {
    return true;
  }

  return new Date(subscription.currentPeriodEnd).getTime() > now.getTime();
}
