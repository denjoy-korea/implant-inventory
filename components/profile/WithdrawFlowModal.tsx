import React from 'react';

interface WithdrawFlowModalProps {
  open: boolean;
  pauseSuccess: boolean;
  withdrawReasons: string[];
  setWithdrawReasons: React.Dispatch<React.SetStateAction<string[]>>;
  withdrawCustom: string;
  setWithdrawCustom: React.Dispatch<React.SetStateAction<string>>;
  featureRequest: string;
  setFeatureRequest: React.Dispatch<React.SetStateAction<string>>;
  wouldStayForFeature: boolean | null;
  setWouldStayForFeature: React.Dispatch<React.SetStateAction<boolean | null>>;
  isWithdrawing: boolean;
  isPausing: boolean;
  onClose: () => void;
  onPause: () => void | Promise<void>;
  onWithdraw: () => void | Promise<void>;
}

const WithdrawFlowModal: React.FC<WithdrawFlowModalProps> = ({
  open,
  pauseSuccess,
  withdrawReasons,
  setWithdrawReasons,
  withdrawCustom,
  setWithdrawCustom,
  featureRequest,
  setFeatureRequest,
  wouldStayForFeature,
  setWouldStayForFeature,
  isWithdrawing,
  isPausing,
  onClose,
  onPause,
  onWithdraw,
}) => {
  if (!open) return null;

  const isFeatureMissing = withdrawReasons.includes('필요한 기능이 없어서');
  const canWithdraw = withdrawReasons.length > 0 && !(withdrawReasons.includes('기타') && !withdrawCustom.trim());
  const today = new Date();
  const resumeDate = new Date(today);
  resumeDate.setMonth(resumeDate.getMonth() + 2);
  const notifyDate = new Date(resumeDate);
  notifyDate.setDate(notifyDate.getDate() - 7);
  const fmtKo = (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-y-auto max-h-[85vh]">
        {pauseSuccess ? (
          /* ── 일시 중지 완료 타임라인 ── */
          <div className="px-6 pt-6 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">일시 중지가 요청되었습니다</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">소중한 의견을 남겨주셔서 감사합니다. 2개월 후 서비스가 자동으로 재개됩니다.</p>

            <div className="bg-slate-50 rounded-2xl px-5 py-4 mb-5">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 mt-0.5" />
                  <div className="w-px flex-1 bg-indigo-200 my-1 min-h-[2.5rem]" />
                </div>
                <div className="pb-5">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">오늘</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmtKo(today)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">일시 중지 시작</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-indigo-300 mt-0.5" />
                  <div className="w-px flex-1 bg-indigo-200 my-1 min-h-[2.5rem]" />
                </div>
                <div className="pb-5">
                  <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">재개 1주 전</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmtKo(notifyDate)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">재개 알림 이메일 발송</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 mt-0.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">2개월 후</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmtKo(resumeDate)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">서비스 자동 재개</p>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
              확인
            </button>
          </div>
        ) : (
          /* ── 탈퇴 사유 선택 ── */
          <>
            <div className="px-6 pt-6 pb-5">
              <h3 className="text-base font-bold text-slate-800 mb-1">회원 탈퇴</h3>
              <p className="text-sm text-slate-500">탈퇴 사유를 선택해주세요. 서비스 개선에 활용됩니다.</p>
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-semibold text-amber-700 mb-1">개인정보 처리 안내</p>
                <ul className="space-y-0.5">
                  <li className="text-[11px] text-amber-600">• 이름·연락처·환자정보는 탈퇴 즉시 파기됩니다.</li>
                  <li className="text-[11px] text-amber-600">• 결제 기록은 전자상거래법에 따라 5년간 보관됩니다.</li>
                  <li className="text-[11px] text-amber-600">• 탈퇴 후 동일 이메일로 재가입 시 이전 데이터 복구가 불가합니다.</li>
                </ul>
              </div>
            </div>

            <div className="px-6 pb-4 space-y-2">
              {['더 이상 사용하지 않아서', '필요한 기능이 없어서', '가격이 부담돼서', '다른 서비스로 이동', '개인정보 삭제 원함', '기타'].map((option) => (
                <label key={option} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${withdrawReasons.includes(option) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                  <input
                    type="checkbox"
                    value={option}
                    checked={withdrawReasons.includes(option)}
                    onChange={(event) => {
                      setWithdrawReasons((prev) => (event.target.checked ? [...prev, option] : prev.filter((reason) => reason !== option)));
                      if (!event.target.checked && option === '기타') setWithdrawCustom('');
                      if (!event.target.checked && option === '필요한 기능이 없어서') {
                        setFeatureRequest('');
                        setWouldStayForFeature(null);
                      }
                    }}
                    className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-slate-700">{option}</span>
                </label>
              ))}

              {withdrawReasons.includes('기타') && (
                <textarea
                  value={withdrawCustom}
                  onChange={(event) => setWithdrawCustom(event.target.value)}
                  placeholder="탈퇴 사유를 직접 입력해주세요."
                  rows={3}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                />
              )}
            </div>

            {/* 기능 부재 선택 시 인라인 섹션 */}
            {isFeatureMissing && (
              <div className="px-6 pb-4">
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-indigo-700">어떤 기능이 필요하신가요?</p>
                  <textarea
                    value={featureRequest}
                    onChange={(event) => {
                      setFeatureRequest(event.target.value);
                      if (!event.target.value.trim()) setWouldStayForFeature(null);
                    }}
                    placeholder="필요하신 기능을 자유롭게 적어주세요."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  {featureRequest.trim().length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 mb-2">해당 기능이 구현된다면 계속 사용하실 의향이 있으신가요?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setWouldStayForFeature(true)}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${wouldStayForFeature === true ? 'bg-indigo-600 text-white' : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-100'}`}
                        >
                          네, 사용할게요
                        </button>
                        <button
                          type="button"
                          onClick={() => setWouldStayForFeature(false)}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${wouldStayForFeature === false ? 'bg-slate-600 text-white' : 'border border-slate-300 text-slate-500 hover:bg-slate-100'}`}
                        >
                          아니요
                        </button>
                      </div>
                    </div>
                  )}
                  {wouldStayForFeature === true && (
                    <div className="pt-1 flex items-start gap-2 text-indigo-700">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs">중지 기간에는 서비스 이용과 이용료 청구가 함께 중단됩니다. 2개월 후 자동으로 재개됩니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose} disabled={isWithdrawing || isPausing} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                취소
              </button>
              {wouldStayForFeature === true ? (
                <>
                  <button onClick={onPause} disabled={isPausing || isWithdrawing} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {isPausing ? '처리 중...' : '2개월 일시 중지'}
                  </button>
                  <button onClick={onWithdraw} disabled={isWithdrawing || !canWithdraw || isPausing} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {isWithdrawing ? '처리 중...' : '탈퇴 계속'}
                  </button>
                </>
              ) : (
                <button onClick={onWithdraw} disabled={isWithdrawing || !canWithdraw} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {isWithdrawing ? '처리 중...' : '탈퇴하기'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WithdrawFlowModal;
