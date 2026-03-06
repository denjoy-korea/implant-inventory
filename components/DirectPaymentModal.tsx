import React, { useCallback, useEffect, useState } from 'react';
import { BillingCycle, PlanType, User } from '../types';
import PricingPaymentModal from './pricing/PricingPaymentModal';
import { tossPaymentService } from '../services/tossPaymentService';
import { couponService, UserCoupon, DiscountPreview } from '../services/couponService';

interface DirectPaymentModalProps {
  plan: PlanType | null;
  billing: BillingCycle;
  user: User | null;
  hospitalName: string;
  onDismiss: () => void;
}

const DirectPaymentModal: React.FC<DirectPaymentModalProps> = ({
  plan,
  billing,
  user,
  hospitalName,
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

  const loadCoupons = useCallback(async () => {
    if (!user?.hospitalId) return;
    try {
      const coupons = await couponService.getAvailableCoupons(user.hospitalId, plan || undefined);
      setAvailableCoupons(coupons);
    } catch {
      // 쿠폰 조회 실패해도 결제는 진행 가능
    }
  }, [user?.hospitalId, plan]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  // 플랜/billing 변경 시 쿠폰 선택 초기화
  useEffect(() => {
    setSelectedCouponId(null);
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
    />
  );
};

export default DirectPaymentModal;
