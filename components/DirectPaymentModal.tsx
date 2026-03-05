import React, { useState } from 'react';
import { BillingCycle, PlanType, User } from '../types';
import PricingPaymentModal from './pricing/PricingPaymentModal';
import { tossPaymentService } from '../services/tossPaymentService';

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
  const [contactPhone, setContactPhone] = useState((user as { phone?: string })?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [receiptType, setReceiptType] = useState<'cash_receipt' | 'tax_invoice'>('cash_receipt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

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
    />
  );
};

export default DirectPaymentModal;
