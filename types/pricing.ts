// ============================================
// Pricing Types
// ============================================

/** 품목별 단가 (item_pricing 테이블 매핑) */
export interface ItemPricing {
  id: string;
  hospitalId: string;
  manufacturer: string;
  brand: string;
  size: string;
  purchasePrice: number;
  treatmentFee: number;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 단가 변경 이력 (item_pricing_history 테이블 매핑) */
export interface ItemPricingHistory {
  id: string;
  itemPricingId: string;
  hospitalId: string;
  manufacturer: string;
  brand: string;
  size: string;
  fieldChanged: 'purchase_price' | 'treatment_fee' | 'both' | 'initial';
  oldPurchasePrice: number | null;
  newPurchasePrice: number | null;
  oldTreatmentFee: number | null;
  newTreatmentFee: number | null;
  changeSource: 'settings' | 'receipt_confirmation';
  changedBy: string | null;
  changedAt: string;
}

/** 단가 upsert 입력 */
export interface PricingUpsertInput {
  manufacturer: string;
  brand: string;
  size: string;
  purchasePrice: number;
  treatmentFee: number;
}

/** 원가율이 포함된 품목 단가 */
export interface CostRatioItem extends ItemPricing {
  /** 원가율: purchasePrice / treatmentFee (0 ~ 1+) */
  costRatio: number;
}
