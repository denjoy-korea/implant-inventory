import { supabase } from './supabaseClient';
import type {
  HospitalScopedServiceCode,
  HospitalServiceMatrixItem,
  HospitalServiceSubscription,
  PlatformServiceCode,
  ServiceCatalogItem,
  ServiceBusinessModel,
  ServiceSubjectType,
} from '../types';
import {
  DEFAULT_SERVICE_CATALOG,
  isHospitalServiceSubscriptionActive,
} from '../types';

type DbServiceCatalogRow = {
  code: PlatformServiceCode;
  display_name: string;
  subject_type: ServiceSubjectType;
  business_model: ServiceBusinessModel;
  sort_order: number;
  is_active: boolean;
};

type DbHospitalServiceSubscriptionRow = {
  id: string;
  hospital_id: string;
  service_code: HospitalScopedServiceCode;
  status: HospitalServiceSubscription['status'];
  service_plan_code: string | null;
  billing_cycle: HospitalServiceSubscription['billingCycle'];
  seat_count: number;
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  source_billing_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function isMissingServiceSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;

  const message = (error.message || '').toLowerCase();
  return message.includes('service_catalog') || message.includes('hospital_service_subscriptions');
}

function mapServiceCatalogRow(row: DbServiceCatalogRow): ServiceCatalogItem {
  return {
    code: row.code,
    displayName: row.display_name,
    subjectType: row.subject_type,
    businessModel: row.business_model,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function mapHospitalServiceSubscriptionRow(
  row: DbHospitalServiceSubscriptionRow,
): HospitalServiceSubscription {
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    serviceCode: row.service_code,
    status: row.status,
    servicePlanCode: row.service_plan_code,
    billingCycle: row.billing_cycle,
    seatCount: row.seat_count,
    startedAt: row.started_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
    sourceBillingId: row.source_billing_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildFallbackImplantInventorySubscription(hospitalId: string): HospitalServiceSubscription {
  // 개발/테스트 환경에서만 폴백 허용. 프로덕션에서 테이블이 없으면 즉시 에러로 노출.
  const isDev = typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
  if (!isDev) {
    throw new Error(
      `[serviceEntitlementService] hospital_service_subscriptions table is missing in production. ` +
      `Run the service entitlement migration before deploying. (hospitalId: ${hospitalId})`,
    );
  }

  const fallbackTime = new Date(0).toISOString();
  return {
    id: `fallback-${hospitalId}-implant_inventory`,
    hospitalId,
    serviceCode: 'implant_inventory',
    status: 'active',
    servicePlanCode: null,
    billingCycle: null,
    seatCount: 1,
    startedAt: fallbackTime,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelledAt: null,
    sourceBillingId: null,
    metadata: { fallback: true, reason: 'service_entitlement_schema_missing' },
    createdAt: fallbackTime,
    updatedAt: fallbackTime,
  };
}

export const serviceEntitlementService = {
  async getServiceCatalog(): Promise<ServiceCatalogItem[]> {
    const { data, error } = await supabase
      .from('service_catalog')
      .select('code, display_name, subject_type, business_model, sort_order, is_active')
      .order('sort_order', { ascending: true });

    if (error) {
      if (isMissingServiceSchemaError(error)) {
        return DEFAULT_SERVICE_CATALOG;
      }
      throw error;
    }

    return ((data ?? []) as DbServiceCatalogRow[]).map(mapServiceCatalogRow);
  },

  async getHospitalSubscriptions(hospitalId: string): Promise<HospitalServiceSubscription[]> {
    const { data, error } = await supabase
      .from('hospital_service_subscriptions')
      .select(`
        id,
        hospital_id,
        service_code,
        status,
        service_plan_code,
        billing_cycle,
        seat_count,
        started_at,
        current_period_start,
        current_period_end,
        cancelled_at,
        source_billing_id,
        metadata,
        created_at,
        updated_at
      `)
      .eq('hospital_id', hospitalId)
      .order('service_code', { ascending: true });

    if (error) {
      if (isMissingServiceSchemaError(error)) {
        return [buildFallbackImplantInventorySubscription(hospitalId)];
      }
      throw error;
    }

    return ((data ?? []) as DbHospitalServiceSubscriptionRow[]).map(mapHospitalServiceSubscriptionRow);
  },

  hasHospitalServiceAccess(
    subscriptions: HospitalServiceSubscription[],
    serviceCode: HospitalScopedServiceCode,
  ): boolean {
    return subscriptions.some((subscription) => {
      return subscription.serviceCode === serviceCode
        && isHospitalServiceSubscriptionActive(subscription);
    });
  },

  async hospitalHasServiceAccess(
    hospitalId: string,
    serviceCode: HospitalScopedServiceCode,
  ): Promise<boolean> {
    const subscriptions = await this.getHospitalSubscriptions(hospitalId);
    return this.hasHospitalServiceAccess(subscriptions, serviceCode);
  },

  async getHospitalServiceMatrix(hospitalId: string): Promise<HospitalServiceMatrixItem[]> {
    const [catalog, subscriptions] = await Promise.all([
      this.getServiceCatalog(),
      this.getHospitalSubscriptions(hospitalId),
    ]);

    return catalog
      .filter((item) => item.subjectType === 'hospital')
      .map((item) => {
        const serviceCode = item.code as HospitalScopedServiceCode;
        const subscription = subscriptions.find((entry) => entry.serviceCode === serviceCode) ?? null;
        return {
          ...item,
          serviceCode,
          hasAccess: subscription ? isHospitalServiceSubscriptionActive(subscription) : false,
          subscription,
        };
      });
  },
};
