
import { useState } from 'react';
import { promoCodeService, CodeType } from '../services/promoCodeService';

function normalizeCode(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

interface UsePromoCodeVerificationDeps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function usePromoCodeVerification(deps: UsePromoCodeVerificationDeps) {
  const { showToast } = deps;

  const [promoCode, setPromoCode] = useState('');
  const [promoVerified, setPromoVerified] = useState(false);
  const [verifiedCodeType, setVerifiedCodeType] = useState<CodeType | null>(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState('');

  const openPromoModal = () => {
    setPromoError('');
    setPromoModalOpen(true);
  };

  const handleVerifyPromoCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalized = normalizeCode(promoCode);
    if (!normalized) {
      setPromoError('코드를 입력해주세요.');
      return;
    }

    setPromoChecking(true);
    setPromoError('');
    const result = await promoCodeService.verifyCode(normalized);
    setPromoChecking(false);

    if (!result.ok) {
      setPromoError(result.message || '유효하지 않은 코드입니다.');
      setPromoVerified(false);
      return;
    }

    setPromoCode(normalized);
    setPromoVerified(true);
    setVerifiedCodeType(result.codeType || 'promo');
    setPromoModalOpen(false);
    setPromoError('');
    showToast(
      result.codeType === 'partner'
        ? '제휴 코드 확인 완료! 가입 시 할인 혜택이 자동 적용됩니다.'
        : result.codeType === 'referral'
          ? '초대 코드 확인 완료! 가입을 진행해주세요.'
          : '코드 확인이 완료되었습니다.',
      'success',
    );
  };

  const resetPromoState = () => {
    setPromoCode('');
    setPromoVerified(false);
    setPromoModalOpen(false);
    setPromoError('');
  };

  return {
    promoCode, setPromoCode,
    promoVerified, setPromoVerified,
    verifiedCodeType,
    promoModalOpen, setPromoModalOpen,
    promoChecking,
    promoError,
    openPromoModal,
    handleVerifyPromoCode,
    resetPromoState,
  };
}
