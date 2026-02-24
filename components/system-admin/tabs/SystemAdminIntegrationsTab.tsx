import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from '../../../services/cryptoUtils';

interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  isSecret: boolean;
}

const NOTION_FIELDS: IntegrationField[] = [
  { key: 'notion_api_token',         label: 'Internal Integration Token', placeholder: 'secret_...', isSecret: true },
  { key: 'notion_consultation_db_id', label: '상담 DB 아이디',              placeholder: '32자리 Database ID', isSecret: false },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function SystemAdminIntegrationsTab() {
  const [notionValues, setNotionValues]     = useState<Record<string, string>>({});
  const [notionMasked, setNotionMasked]     = useState<Record<string, boolean>>({});
  const [notionSaved,  setNotionSaved]      = useState<Record<string, boolean>>({});
  const [saveState,    setSaveState]        = useState<SaveState>('idle');
  const [errorMsg,     setErrorMsg]         = useState('');
  const [loading,      setLoading]          = useState(true);

  useEffect(() => {
    loadSavedValues();
  }, []);

  const loadSavedValues = async () => {
    setLoading(true);
    try {
      const keys = NOTION_FIELDS.map(f => f.key);
      const { data, error } = await supabase
        .from('system_integrations')
        .select('key, value, label')
        .in('key', keys);

      if (error) throw error;

      const values: Record<string, string> = {};
      const masked: Record<string, boolean> = {};
      const saved:  Record<string, boolean> = {};

      for (const field of NOTION_FIELDS) {
        const row = data?.find(r => r.key === field.key);
        if (row) {
          const decrypted = await decryptPatientInfo(row.value).catch(() => '');
          values[field.key] = decrypted;
          masked[field.key] = field.isSecret; // 저장된 시크릿은 기본 마스킹
          saved[field.key]  = true;
        } else {
          values[field.key] = '';
          masked[field.key] = false;
          saved[field.key]  = false;
        }
      }

      setNotionValues(values);
      setNotionMasked(masked);
      setNotionSaved(saved);
    } catch (err) {
      console.error('[IntegrationsTab] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveState('saving');
    setErrorMsg('');
    try {
      for (const field of NOTION_FIELDS) {
        const raw = notionValues[field.key]?.trim();
        if (!raw) continue;

        const encrypted = await encryptPatientInfo(raw);

        await supabase
          .from('system_integrations')
          .upsert({ key: field.key, value: encrypted, label: field.label, updated_at: new Date().toISOString() });
      }

      setSaveState('success');
      await loadSavedValues();
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      console.error('[IntegrationsTab] save error:', err);
      setErrorMsg(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
      setSaveState('error');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await supabase.from('system_integrations').delete().eq('key', key);
      setNotionValues(prev => ({ ...prev, [key]: '' }));
      setNotionSaved(prev => ({ ...prev, [key]: false }));
    } catch (err) {
      console.error('[IntegrationsTab] delete error:', err);
    }
  };

  const allFilled = NOTION_FIELDS.every(f => notionValues[f.key]?.trim());

  return (
    <div className="space-y-6">
      {/* 노션 연결 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          {/* Notion 로고 */}
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 100 100" fill="currentColor">
              <path d="M6.55 6.3c3.18 2.57 4.37 2.37 10.34 1.98l56.2-3.38c1.19 0 .2-.99-.39-1.18L63.08.56C61.5.17 59.72 0 57.95 0L10.71 3.78C8.34 3.98 6 5.16 6.55 6.3zm3.58 13.09V73.8c0 3.18.79 4.77 3.78 5.16l62.77 3.58c2.97.39 3.97-.79 3.97-3.38V25.76c0-2.57-.99-3.97-3.18-3.77L13.92 19.01c-2.18.2-3.78 1.39-3.78 4.38zm59.97 3.17c.39 1.79 0 3.58-1.79 3.78l-2.97.59v43.64c-2.57 1.39-5.16 2.18-7.14 2.18-3.38 0-4.17-1-6.75-4.17L34.67 36.51v42.45l8.53 1.79s0 3.58-4.97 3.58L24.33 85.5c-.39-1-.2-3.38 1.39-3.77l3.58-.99V31.94l-4.97-.39c-.39-1.79.59-4.37 3.38-4.57l13.49-.99L56.76 51.8V11.13l-7.14-.79c-.39-2.18 1-3.77 3.38-3.97l13.49-.99.2.39c0 0-.99.79-1.39 2.97l.79 4.57z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Notion 연결</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">상담 신청 시 노션 DB에 자동으로 row가 생성됩니다</p>
          </div>
          {/* 연결 상태 배지 */}
          {!loading && (
            notionSaved['notion_api_token'] && notionSaved['notion_consultation_db_id'] ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                연결됨
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                미연결
              </span>
            )
          )}
        </div>

        {/* 설정 폼 */}
        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {NOTION_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {field.label}
                    {notionSaved[field.key] && (
                      <span className="ml-2 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">저장됨</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={field.isSecret && notionMasked[field.key] ? 'password' : 'text'}
                        value={notionValues[field.key] || ''}
                        onChange={e => setNotionValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full text-xs font-mono px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 placeholder-slate-300"
                      />
                      {field.isSecret && (
                        <button
                          type="button"
                          onClick={() => setNotionMasked(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {notionMasked[field.key] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                          )}
                        </button>
                      )}
                    </div>
                    {notionSaved[field.key] && (
                      <button
                        type="button"
                        onClick={() => handleDelete(field.key)}
                        className="px-2.5 py-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* 저장 버튼 */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!allFilled || saveState === 'saving'}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  {saveState === 'saving' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      암호화 저장 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      암호화하여 저장
                    </>
                  )}
                </button>
                {saveState === 'success' && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    저장 완료
                  </span>
                )}
                {saveState === 'error' && (
                  <span className="text-xs font-bold text-rose-600">{errorMsg}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
          <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
            <li>API Token과 DB ID는 <strong>ENCv2 암호화</strong>되어 DB에 저장됩니다.</li>
            <li>Notion DB 컬럼명: 이름·병원명·이메일·연락처·지역·선호 날짜·선호 시간대·추가 요청·상태·신청 일시</li>
            <li>Integration을 Notion DB에 연결(Connect) 해야 row가 생성됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
