import React, { useCallback, useEffect, useState } from 'react';
import { BillingCycle, HospitalPlanState, PlanType, User, PLAN_ORDER } from '../types';
import PricingPaymentModal from './pricing/PricingPaymentModal';
import { tossPaymentService } from '../services/tossPaymentService';
import { couponService, UserCoupon, DiscountPreview } from '../services/couponService';
import { planService } from '../services/planService';
import { calcUpgradeCredit, UpgradeCredit } from '../services/refundService';

interface DirectPaymentModalProps {
  plan: PlanType | null;
  billing: BillingCycle;
  user: User | null;
  hospitalName: string;
  planState?: HospitalPlanState | null;
  onDismiss: () => void;
}

const DirectPaymentModal: React.FC<DirectPaymentModalProps> = ({
  plan,
  billing,
  user,
  hospitalName,
  planState,
  onDismiss,
}) => {
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [receiptType, setReceiptType] = useState<'cash_receipt' | 'tax_invoice'>('cash_receipt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // 쿠폰 관련 상태
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);

  // 업그레이드 크레딧 상태
  const [upgradeCredit, setUpgradeCredit] = useState<UpgradeCredit | null>(null);

  // 잔액 크레딧 (다운그레이드로 적립된 잔액)
  const creditBalance = planState?.creditBalance ?? 0;
  const [creditUsedAmount, setCreditUsedAmount] = useState(0);

  const loadCoupons = useCallback(async () => {
    if (!user?.hospitalId) return;
    try {
      const coupons = await couponService.getAvailableCoupons(user.hospitalId, plan || undefined);
      setAvailableCoupons(coupons);
    } catch {
      // 쿠폰 조회 실패해도 결제는 진행 가능
    }
  }, [user?.hospitalId, plan]);

  // 업그레이드 크레딧 계산: 현재 유료 플랜 → 상위 플랜으로 변경하는 경우에만
  const loadUpgradeCredit = useCallback(async () => {
    if (!user?.hospitalId || !plan || plan === 'free') { setUpgradeCredit(null); return; }
    const currentPlan = planState?.plan;
    if (!currentPlan || currentPlan === 'free' || currentPlan === 'ultimate') { setUpgradeCredit(null); return; }
    if (PLAN_ORDER[plan] <= PLAN_ORDER[currentPlan]) { setUpgradeCredit(null); return; }

    try {
      const billing = await planService.getLatestCompletedBilling(user.hospitalId);
      if (!billing) { setUpgradeCredit(null); return; }
      // 다운그레이드 후 재업그레이드 방어:
      // 최신 결제 건이 현재 플랜과 다르면(e.g. Business 결제 후 Plus로 다운그레이드)
      // 이전 결제 건을 업그레이드 크레딧으로 쓸 수 없음 — 크레딧은 credit_balance에 이미 적립됨
      if (billing.plan !== currentPlan) { setUpgradeCredit(null); return; }
      setUpgradeCredit(calcUpgradeCredit(billing));
    } catch {
      setUpgradeCredit(null);
    }
  }, [user?.hospitalId, plan, planState?.plan]);

  useEffect(() => {
    void loadCoupons();
    void loadUpgradeCredit();
  }, [loadCoupons, loadUpgradeCredit]);

  // 플랜/billing 변경 시 쿠폰 선택 + 크레딧 사용 초기화
  useEffect(() => {
    setSelectedCouponId(null);
    setCreditUsedAmount(0);
  }, [plan, billing]);

  // 쿠폰 선택 시 할인 미리보기 계산
  useEffect(() => {
    if (!selectedCouponId || !plan || plan === 'free') {
      setDiscountPreview(null);
      return;
    }
    const coupon = availableCoupons.find((c) => c.id === selectedCouponId);
    if (!coupon) {
      setDiscountPreview(null);
      return;
    }
    const baseAmount = tossPaymentService.calcBaseAmount(plan, billing);
    setDiscountPreview(couponService.previewDiscount(coupon, baseAmount));
  }, [selectedCouponId, plan, billing, availableCoupons]);

  const handleSubmit = async () => {
    if (!plan || plan === 'free') return;
    if (!user?.hospitalId) return;

    setIsSubmitting(true);
    setRequestError(null);
    try {
      const result = await tossPaymentService.requestPayment({
        hospitalId: user.hospitalId,
        plan,
        billingCycle: billing,
        customerName: contactName.trim(),
        paymentMethod,
        couponId: selectedCouponId || undefined,
        discountAmount: discountPreview?.discount_amount,
        upgradeCreditAmount: upgradeCredit?.creditAmount,
        upgradeSourceBillingId: upgradeCredit?.sourceBillingId,
        creditUsedAmount: creditUsedAmount > 0 ? creditUsedAmount : undefined,
      });
      if (result.error && result.error !== 'user_cancel') {
        setRequestError(result.error);
      }
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PricingPaymentModal
      selectedPlan={plan}
      isYearly={billing === 'yearly'}
      hospitalName={hospitalName}
      contactName={contactName}
      contactPhone={contactPhone}
      paymentMethod={paymentMethod}
      receiptType={receiptType}
      isSubmitting={isSubmitting}
      requestError={requestError}
      onDismiss={onDismiss}
      onCancel={onDismiss}
      onContactNameChange={setContactName}
      onContactPhoneChange={setContactPhone}
      onPaymentMethodChange={setPaymentMethod}
      onReceiptTypeChange={setReceiptType}
      onSubmit={handleSubmit}
      availableCoupons={availableCoupons}
      selectedCouponId={selectedCouponId}
      onSelectCoupon={setSelectedCouponId}
      discountPreview={discountPreview}
      upgradeCredit={upgradeCredit}
      creditBalance={creditBalance}
      creditUsedAmount={creditUsedAmount}
      onCreditUsedChange={setCreditUsedAmount}
    />
  );
};

export default DirectPaymentModal;
