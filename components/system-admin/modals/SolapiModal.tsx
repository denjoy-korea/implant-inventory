import { useState, useEffect } from 'react';
import ModalShell from '../../shared/ModalShell';
import ConfirmModal from '../../ConfirmModal';
import { supabase } from '../../../services/supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from '../../../services/cryptoUtils';

// ── 솔라피 자격증명 모달 ───────────────────────────────────────────────────
type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface SolapiCreds {
  api_key: string;
  api_secret: string;
  sender: string;
}

function SolapiModal({ onClose }: { onClose: () => void }) {
  const [loading,      setLoading]      = useState(true);
  const [apiKey,       setApiKey]       = useState('');
  const [apiSecret,    setApiSecret]    = useState('');
  const [sender,       setSender]       = useState('');
  const [keyMasked,    setKeyMasked]    = useState(true);
  const [secretMasked, setSecretMasked] = useState(true);
  const [saveState,    setSaveState]    = useState<SaveState>('idle');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [isConnected,  setIsConnected]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('system_integrations')
          .select('value')
          .eq('key', 'solapi_credentials')
          .maybeSingle();
        if (data?.value) {
          const dec = await decryptPatientInfo(data.value).catch(() => '{}');
          const creds: Partial<SolapiCreds> = JSON.parse(dec);
          setApiKey(creds.api_key ?? '');
          setApiSecret(creds.api_secret ?? '');
          setSender(creds.sender ?? '');
          setIsConnected(!!(creds.api_key && creds.api_secret));
        }
      } catch (e) {
        console.error('[SolapiModal] load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const key    = apiKey.trim();
    const secret = apiSecret.trim();
    const phone  = sender.trim();
    if (!key || !secret) { setErrorMsg('API Key와 API Secret는 필수입니다.'); return; }
    setSaveState('saving');
    setErrorMsg('');
    try {
      const creds: SolapiCreds = { api_key: key, api_secret: secret, sender: phone };
      const encrypted = await encryptPatientInfo(JSON.stringify(creds));
      const { error } = await supabase
        .from('system_integrations')
        .upsert({ key: 'solapi_credentials', value: encrypted, label: '솔라피 API 자격증명', updated_at: new Date().toISOString() });
      if (error) throw error;
      setIsConnected(true);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
      setSaveState('error');
    }
  };

  const handleDelete = () => {
    setConfirmDelete(true);
  };

  const executeDelete = async () => {
    setConfirmDelete(false);
    setSaveState('saving');
    try {
      await supabase.from('system_integrations').delete().eq('key', 'solapi_credentials');
      setApiKey(''); setApiSecret(''); setSender('');
      setIsConnected(false);
      setSaveState('idle');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.');
      setSaveState('error');
    }
  };


  return (
    <>
    <ModalShell isOpen={true} onClose={onClose} title="솔라피 API 관리" titleId="solapi-modal-title" maxWidth="max-w-md" className="flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="solapi-modal-title" className="text-sm font-bold text-slate-800">솔라피 API 관리</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">SMS / 알림톡 발송을 위한 API 자격증명을 저장합니다</p>
          </div>
          {!loading && (
            isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />연결됨
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />미연결
              </span>
            )
          )}
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-[#0066FF] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* API Key */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">API Key <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type={keyMasked ? 'password' : 'text'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="솔라피 API Key"
                    className="w-full text-xs font-mono px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] bg-slate-50 placeholder-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setKeyMasked(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {keyMasked ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">API Secret <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type={secretMasked ? 'password' : 'text'}
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    placeholder="솔라피 API Secret"
                    className="w-full text-xs font-mono px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] bg-slate-50 placeholder-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setSecretMasked(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {secretMasked ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 발신번호 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">발신번호</label>
                <input
                  type="text"
                  value={sender}
                  onChange={e => setSender(e.target.value)}
                  placeholder="예: 01012345678 또는 0215991234"
                  className="w-full text-xs font-mono px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] bg-slate-50 placeholder-slate-300"
                />
                <p className="text-[11px] text-slate-400 mt-1">솔라피에 등록된 발신번호 (- 없이 숫자만)</p>
              </div>

              {/* 저장/삭제 버튼 */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="flex-1 py-2.5 bg-[#0066FF] text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0052CC] transition-colors flex items-center justify-center gap-2"
                >
                  {saveState === 'saving' ? (
                    <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />저장 중...</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>저장</>
                  )}
                </button>
                {isConnected && (
                  <button
                    onClick={handleDelete}
                    disabled={saveState === 'saving'}
                    className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors disabled:opacity-40"
                    title="연동 해제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                )}
              </div>
              {saveState === 'success' && (
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>저장 완료
                </p>
              )}
              {saveState === 'error' && <p className="text-xs font-bold text-rose-600">{errorMsg}</p>}

              {/* 안내 */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
                <p className="text-[11px] font-bold text-blue-700">활용 예시</p>
                <ul className="text-[11px] text-blue-600 space-y-0.5 list-disc list-inside">
                  <li>상담 신청 접수 → 운영팀 SMS 알림</li>
                  <li>회원가입 완료 → 환영 문자 / 알림톡</li>
                  <li>플랜 만료 임박 → 병원 결제 안내 문자</li>
                  <li>본인 인증 OTP 발송</li>
                </ul>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
                  <li>API Key / Secret은 <strong>ENCv2 암호화</strong>되어 저장됩니다.</li>
                  <li>솔라피 콘솔 → API Keys 메뉴에서 발급하세요.</li>
                </ul>
              </div>
            </>
          )}
        </div>
    </ModalShell>
    {confirmDelete && (
      <ConfirmModal
        title="솔라피 연동 해제"
        message="솔라피 연동을 해제하시겠습니까?"
        confirmLabel="해제"
        confirmColor="rose"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  );
}

export default SolapiModal;
