import React, { useEffect, useState } from 'react';
import { PLAN_NAMES, PLAN_PRICING, PlanType } from '../../types';
import LegalModal from '../shared/LegalModal';
import ModalShell from '../shared/ModalShell';
import { formatPrice } from './pricingData';
import type { UserCoupon, DiscountPreview } from '../../services/couponService';

type PaymentMethod = 'card' | 'transfer';
type ReceiptType = 'cash_receipt' | 'tax_invoice';

interface PricingPaymentModalProps {
  selectedPlan: PlanType | null;
  isYearly: boolean;
  hospitalName?: string;
  contactName: string;
  contactPhone: string;
  paymentMethod: PaymentMethod;
  receiptType: ReceiptType;
  isSubmitting: boolean;
  onDismiss: () => void;
  onCancel: () => void;
  onContactNameChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onReceiptTypeChange: (value: ReceiptType) => void;
  onSubmit: () => void;
  requestError?: string | null;
  onRequestConsultation?: () => void;
  onRecommendAlternativePlan?: () => void;
  /** 쿠폰 관련 (선택) */
  availableCoupons?: UserCoupon[];
  selectedCouponId?: string | null;
  onSelectCoupon?: (couponId: string | null) => void;
  discountPreview?: DiscountPreview | null;
}

const PricingPaymentModal: React.FC<PricingPaymentModalProps> = ({
  selectedPlan,
  isYearly,
  hospitalName,
  contactName,
  contactPhone,
  paymentMethod,
  receiptType,
  isSubmitting,
  onDismiss,
  onCancel,
  onContactNameChange,
  onContactPhoneChange,
  onPaymentMethodChange,
  onReceiptTypeChange,
  onSubmit,
  requestError,
  onRequestConsultation,
  onRecommendAlternativePlan,
  availableCoupons,
  selectedCouponId,
  onSelectCoupon,
  discountPreview,
}) => {
  const [agreedToPaymentPolicy, setAgreedToPaymentPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    setAgreedToPaymentPolicy(false);
  }, [selectedPlan, isYearly]);

  if (!selectedPlan || selectedPlan === 'free') return null;

  const monthlyPrice = isYearly ? PLAN_PRICING[selectedPlan].yearlyPrice : PLAN_PRICING[selectedPlan].monthlyPrice;
  const rawBase = isYearly ? monthlyPrice * 12 : monthlyPrice;
  // 연간: 공급가액 천원 단위 절사
  const basePrice = isYearly ? Math.floor(rawBase / 1000) * 1000 : rawBase;
  const vat = Math.round(basePrice * 0.1);
  const rawTotal = basePrice + vat;
  // 합계도 천원 단위 절사 (100원 단위 제거)
  const finalTotal = isYearly ? Math.floor(rawTotal / 1000) * 1000 : rawTotal;
  const cutAmount = rawTotal - finalTotal; // 절사된 금액
  // 월간 대비 절약 = 월간(VAT포함)/년 - 연간 합계
  const monthlyTotalPerYear = Math.round(PLAN_PRICING[selectedPlan].monthlyPrice * 12 * 1.1);
  const yearlySaving = monthlyTotalPerYear - finalTotal;

  return (
    <>
    <ModalShell isOpen={true} onClose={() => !isSubmitting && onDismiss()} title="결제 안내" titleId="pricing-payment-title" describedBy="pricing-payment-desc" zIndex={200} closeable={!isSubmitting} maxWidth="max-w-md" className="overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="pricing-payment-title" className="text-lg font-bold">결제 안내</h3>
              <p id="pricing-payment-desc" className="text-indigo-200 text-sm mt-1">
                {PLAN_NAMES[selectedPlan]} 플랜으로 변경합니다
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isSubmitting && onDismiss()}
              aria-label="결제 모달 닫기"
              className="text-indigo-200 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">플랜</span>
              <span className="text-sm font-bold text-slate-800">{PLAN_NAMES[selectedPlan]}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">결제 주기</span>
              <span className="text-sm font-bold text-slate-800">{isYearly ? '연간 결제' : '월간 결제'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">월 요금</span>
              <span className="text-sm font-bold text-slate-800">{formatPrice(monthlyPrice)}원/월</span>
            </div>
            <div className="border-t border-slate-200 pt-2 space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>공급가액</span>
                <span>{formatPrice(basePrice)}원</span>
              </div>
              {isYearly && cutAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-500">
                  <span>절사금액</span>
                  <span>-{formatPrice(cutAmount)}원</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>부가세 (10%)</span>
                <span>{formatPrice(vat)}원</span>
              </div>
              {discountPreview && discountPreview.discount_amount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">소계 (VAT 포함)</span>
                    <span className="text-sm text-slate-500 line-through">{formatPrice(finalTotal)}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-violet-600 font-semibold">쿠폰 할인</span>
                    <span className="text-sm font-bold text-violet-600">-{formatPrice(discountPreview.discount_amount)}원</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-700">합계 (VAT 포함)</span>
                <span className="text-lg font-black text-indigo-600">
                  {formatPrice(discountPreview ? finalTotal - discountPreview.discount_amount : finalTotal)}원
                </span>
              </div>
            </div>
            {isYearly && (
              <p className="text-xs text-emerald-600 text-right">
                월간 대비 {formatPrice(yearlySaving)}원 절약 (VAT 포함)
              </p>
            )}
          </div>

          {/* 쿠폰 선택 */}
          {availableCoupons && availableCoupons.length > 0 && onSelectCoupon && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">쿠폰 적용</label>
              <select
                value={selectedCouponId || ''}
                onChange={(e) => onSelectCoupon(e.target.value || null)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">쿠폰 미적용</option>
                {availableCoupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.template?.name || '쿠폰'} ({c.discount_type === 'percentage' ? `${c.discount_value}%` : `${formatPrice(c.discount_value)}원`} 할인, 잔여 {c.max_uses - c.used_count}회)
                  </option>
                ))}
              </select>
            </div>
          )}

          {hospitalName && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">병원명</label>
              <p className="text-sm font-medium text-slate-800 bg-slate-50 rounded-lg px-3 py-2">{hospitalName}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">결제 방법 *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPaymentMethodChange('card')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  paymentMethod === 'card'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                신용카드
              </button>
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-300 text-sm font-bold cursor-not-allowed"
                title="계좌이체는 준비 중입니다"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                계좌이체
                <span className="ml-1 text-[10px] font-bold text-slate-300">준비 중</span>
              </button>
            </div>
          </div>

          {paymentMethod === 'transfer' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">증빙 서류 *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onReceiptTypeChange('cash_receipt')}
                  className={`px-4 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    receiptType === 'cash_receipt'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  현금영수증
                </button>
                <button
                  type="button"
                  onClick={() => onReceiptTypeChange('tax_invoice')}
                  className={`px-4 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    receiptType === 'tax_invoice'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  세금계산서
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pricing-payment-contact-name" className="block text-xs font-bold text-slate-500 mb-1">담당자 이름 *</label>
              <input
                id="pricing-payment-contact-name"
                type="text"
                value={contactName}
                onChange={(e) => onContactNameChange(e.target.value)}
                placeholder="홍길동"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="pricing-payment-contact-phone" className="block text-xs font-bold text-slate-500 mb-1">연락처 *</label>
              <input
                id="pricing-payment-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => onContactPhoneChange(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {onRequestConsultation && (
            <button
              type="button"
              onClick={onRequestConsultation}
              className="w-full text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              결제가 어려우시면 도입 상담으로 전환하기
            </button>
          )}

          {requestError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">{requestError}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {onRecommendAlternativePlan && (
                  <button
                    type="button"
                    onClick={onRecommendAlternativePlan}
                    className="font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    Free 플랜 먼저 보기
                  </button>
                )}
                {onRequestConsultation && (
                  <button
                    type="button"
                    onClick={onRequestConsultation}
                    className="font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
                  >
                    도입 상담 연결
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToPaymentPolicy}
                onChange={(event) => setAgreedToPaymentPolicy(event.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                결제 안내와 개인정보 처리에 동의합니다.
              </span>
            </label>
            <div className="mt-1.5 ml-6 flex items-center gap-2 text-[11px]">
              <button type="button" onClick={() => setShowTerms(true)} className="text-indigo-600 hover:underline">이용약관</button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={() => setShowPrivacy(true)} className="text-indigo-600 hover:underline">개인정보처리방침</button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !contactName.trim() || !contactPhone.trim() || !agreedToPaymentPolicy}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '처리 중...' : paymentMethod === 'card' ? '카드로 결제하기' : '계좌이체로 결제하기'}
            </button>
          </div>
        </div>
    </ModalShell>
    {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
    {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
    </>
  );
};

export default PricingPaymentModal;
