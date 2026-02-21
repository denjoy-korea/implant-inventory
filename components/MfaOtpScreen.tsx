import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';

interface MfaOtpScreenProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 8;

const MfaOtpScreen: React.FC<MfaOtpScreenProps> = ({ email, onVerified, onCancel }) => {
  const [otp, setOtp] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSentRef = useRef(false);

  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    sendOtp();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setIsSending(true);
    setError('');
    const result = await authService.sendMfaOtp(email);
    setIsSending(false);
    if (result.success) {
      startCountdown();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setError(result.error || '인증 코드 발송에 실패했습니다.');
    }
  };

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    if (error) setError('');
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      setError(`${OTP_LENGTH}자리 코드를 입력해주세요.`);
      return;
    }
    setIsSubmitting(true);
    setError('');
    const result = await authService.verifyMfaOtp(email, otp);
    if (!result.success) {
      setIsSubmitting(false);
      setError(result.error || '코드가 올바르지 않습니다. 다시 시도해주세요.');
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    if (trustDevice) {
      await authService.registerTrustedDevice();
    }
    setIsSubmitting(false);
    onVerified();
  };

  const handleCancel = async () => {
    await authService.signOut();
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  // 마스킹된 이메일 표시
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length <= 2
    ? localPart[0] + '*'.repeat(Math.max(1, localPart.length - 1))
    : localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  const maskedEmail = `${maskedLocal}@${domain}`;

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50/50">
      <div className="w-full max-w-[440px]">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">2단계 인증</h2>
                <p className="text-indigo-200 text-xs">보안을 위해 인증 코드를 확인합니다</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7 space-y-5">
            {/* 발송 안내 */}
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 space-y-2">
              <p className="text-sm text-indigo-700">
                {isSending
                  ? '인증 코드를 발송 중...'
                  : <>
                      <span className="font-semibold">{maskedEmail}</span>로<br />
                      인증 코드가 발송되었습니다.
                    </>
                }
              </p>
              <div className="flex items-start gap-1.5 pt-1 border-t border-indigo-100">
                <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-indigo-500 leading-relaxed">
                  발신자: <span className="font-medium">Supabase Auth &lt;noreply@mail.app.supabase.io&gt;</span><br />
                  메일이 보이지 않으면 <span className="font-medium">스팸 메일함</span>을 확인해주세요.
                </p>
              </div>
            </div>

            {/* OTP 입력 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                인증 코드
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={e => handleOtpChange(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={OTP_LENGTH}
                placeholder="인증 코드 입력"
                disabled={isSubmitting}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl font-mono tracking-[0.5em] text-slate-700 placeholder:text-slate-300 placeholder:text-base placeholder:tracking-normal disabled:bg-slate-50 transition"
              />
              {error && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>
              )}
            </div>

            {/* 기기 신뢰 체크박스 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={e => setTrustDevice(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                  trustDevice ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-slate-400'
                }`} style={{ width: '18px', height: '18px' }}>
                  {trustDevice && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">이 기기를 30일간 신뢰</p>
                <p className="text-xs text-slate-400 mt-0.5">체크 시 이 브라우저에서 30일간 OTP를 건너뜁니다</p>
              </div>
            </label>

            {/* 확인 버튼 */}
            <button
              onClick={handleVerify}
              disabled={isSubmitting || otp.length !== OTP_LENGTH}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  확인 중...
                </span>
              ) : '인증 완료'}
            </button>

            {/* 재전송 / 취소 */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={sendOtp}
                disabled={cooldown > 0 || isSending}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {cooldown > 0
                  ? `재전송 (${cooldown}초)`
                  : isSending ? '발송 중...' : '코드 재전송'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                로그인으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MfaOtpScreen;
