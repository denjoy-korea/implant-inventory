import React from 'react';
import { BillingCycle, PLAN_NAMES, PLAN_PRICING, PlanType } from '../../types';

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
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
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
}) => {
  if (!selectedPlan || selectedPlan === 'free') return null;

  const billingCycle: BillingCycle = isYearly ? 'yearly' : 'monthly';
  const monthlyPrice = billingCycle === 'yearly' ? PLAN_PRICING[selectedPlan].yearlyPrice : PLAN_PRICING[selectedPlan].monthlyPrice;
  const basePrice = billingCycle === 'yearly' ? PLAN_PRICING[selectedPlan].yearlyPrice * 12 : PLAN_PRICING[selectedPlan].monthlyPrice;
  const vat = Math.round(basePrice * 0.1);
  const yearlySaving = (PLAN_PRICING[selectedPlan].monthlyPrice - PLAN_PRICING[selectedPlan].yearlyPrice) * 12;

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={() => !isSubmitting && onDismiss()}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
          <h3 className="text-lg font-bold">결제 안내</h3>
          <p className="text-indigo-200 text-sm mt-1">
            {PLAN_NAMES[selectedPlan]} 플랜으로 변경합니다
          </p>
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
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>부가세 (10%)</span>
                <span>{formatPrice(vat)}원</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-700">합계 (VAT 포함)</span>
                <span className="text-lg font-black text-indigo-600">{formatPrice(basePrice + vat)}원</span>
              </div>
            </div>
            {isYearly && (
              <p className="text-xs text-emerald-600 text-right">
                월간 대비 {formatPrice(yearlySaving)}원 절약 (VAT 별도)
              </p>
            )}
          </div>

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
                onClick={() => onPaymentMethodChange('transfer')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                계좌이체
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

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">담당자 이름 *</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => onContactNameChange(e.target.value)}
              placeholder="홍길동"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">연락처 (결제 문자 수신) *</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {paymentMethod === 'card'
              ? '결제 요청 후 입력하신 연락처로 카드결제 안내 문자가 발송됩니다. 문자 내 링크를 통해 결제를 완료하시면 플랜이 즉시 활성화됩니다.'
              : '결제 요청 후 입력하신 연락처로 계좌이체 안내 문자가 발송됩니다. 입금 확인 후 플랜이 활성화되며, 증빙 서류가 발행됩니다.'}
          </p>

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
              disabled={isSubmitting || !contactName.trim() || !contactPhone.trim()}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '처리 중...' : paymentMethod === 'card' ? '카드결제 요청' : '계좌이체 요청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPaymentModal;
