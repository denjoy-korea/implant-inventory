
import { useState, useEffect } from 'react';
import { betaInviteService, CodeType } from '../services/betaInviteService';
import { getBetaSignupPolicy, normalizeBetaInviteCode } from '../utils/betaSignupPolicy';

interface UseBetaCodeVerificationDeps {
  type: 'login' | 'signup' | 'invite';
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function useBetaCodeVerification(deps: UseBetaCodeVerificationDeps) {
  const { type, showToast } = deps;

  const [betaInviteCode, setBetaInviteCode] = useState('');
  const [betaInviteVerified, setBetaInviteVerified] = useState(false);
  const [verifiedCodeType, setVerifiedCodeType] = useState<CodeType | null>(null);
  const [betaInviteModalOpen, setBetaInviteModalOpen] = useState(false);
  const [betaInviteChecking, setBetaInviteChecking] = useState(false);
  const [betaInviteError, setBetaInviteError] = useState('');

  const betaSignupPolicy = getBetaSignupPolicy();
  const isBetaInviteRequired = type === 'signup' && betaSignupPolicy.requiresInviteCode;

  // Auto-open modal when required
  useEffect(() => {
    if (type !== 'signup') return;
    if (!isBetaInviteRequired) return;
    if (betaInviteVerified) return;
    setBetaInviteModalOpen(true);
  }, [type, isBetaInviteRequired, betaInviteVerified]);

  const openBetaInviteModal = () => {
    setBetaInviteError('');
    setBetaInviteModalOpen(true);
  };

  const handleVerifyBetaInviteCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalizedCode = normalizeBetaInviteCode(betaInviteCode);
    if (!normalizedCode) {
      setBetaInviteError('초대 코드를 입력해주세요.');
      return;
    }

    setBetaInviteChecking(true);
    setBetaInviteError('');
    const result = await betaInviteService.verifyCode(normalizedCode);
    setBetaInviteChecking(false);

    if (!result.ok) {
      setBetaInviteError(result.message || '유효하지 않은 초대 코드입니다.');
      setBetaInviteVerified(false);
      return;
    }

    setBetaInviteCode(normalizedCode);
    setBetaInviteVerified(true);
    setVerifiedCodeType(result.codeType || 'beta');
    setBetaInviteModalOpen(false);
    setBetaInviteError('');
    showToast(
      result.codeType === 'partner'
        ? '제휴 코드 확인 완료! 가입 시 할인 혜택이 자동 적용됩니다.'
        : '코드 확인이 완료되었습니다.',
      'success',
    );
  };

  const resetBetaState = () => {
    setBetaInviteCode('');
    setBetaInviteVerified(false);
    setBetaInviteModalOpen(false);
    setBetaInviteError('');
  };

  return {
    betaInviteCode, setBetaInviteCode,
    betaInviteVerified, setBetaInviteVerified,
    verifiedCodeType,
    betaInviteModalOpen, setBetaInviteModalOpen,
    betaInviteChecking,
    betaInviteError,
    betaSignupPolicy,
    isBetaInviteRequired,
    openBetaInviteModal,
    handleVerifyBetaInviteCode,
    resetBetaState,
  };
}
