import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from '../../../services/cryptoUtils';

// ── Slack 웹훅 모달 ────────────────────────────────────────────────────────
export interface SlackWebhook {
  id: string;
  name: string;
  url: string;
}

// 채널명 → 연결된 앱 기능 (Edge Function 기준)
const KNOWN_CHANNELS: Record<string, string[]> = {
  '멤버알림':  ['회원 가입', '탈퇴'],
  '문의알림':  ['문의하기', '상담 신청'],
  '대기자알림': ['대기자 신청'],
  '분석알림':  ['무료 분석'],
};

function SlackModal({ onClose }: { onClose: () => void }) {
  const [webhooks,  setWebhooks]  = useState<SlackWebhook[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saveError, setSaveError] = useState('');
  const [newName,      setNewName]      = useState('');
  const [newUrl,       setNewUrl]       = useState('');
  const [newUrlMasked, setNewUrlMasked] = useState(true);
  const [adding,       setAdding]       = useState(false);
  const [masked,       setMasked]       = useState<Record<string, boolean>>({});

  useEffect(() => { loadWebhooks(); }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('system_integrations')
        .select('value')
        .eq('key', 'slack_webhooks')
        .maybeSingle();
      if (data?.value) {
        const decrypted = await decryptPatientInfo(data.value).catch(() => '[]');
        const list: SlackWebhook[] = JSON.parse(decrypted);
        setWebhooks(list);
        // 기본값: URL 마스킹
        setMasked(Object.fromEntries(list.map(w => [w.id, true])));
      }
    } catch (err) {
      console.error('[SlackModal] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistWebhooks = async (list: SlackWebhook[]) => {
    setSaveError('');
    const encrypted = await encryptPatientInfo(JSON.stringify(list));
    const { error } = await supabase
      .from('system_integrations')
      .upsert({ key: 'slack_webhooks', value: encrypted, label: 'Slack 웹훅 목록', updated_at: new Date().toISOString() });
    if (error) throw error;
  };

  const handleAdd = async () => {
    const name = newName.trim();
    const url  = newUrl.trim();
    if (!name || !url) return;
    setAdding(true);
    setSaveError('');
    try {
      const entry: SlackWebhook = { id: crypto.randomUUID(), name, url };
      const next = [...webhooks, entry];
      await persistWebhooks(next);
      setWebhooks(next);
      setMasked(prev => ({ ...prev, [entry.id]: true }));
      setNewName('');
      setNewUrl('');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaveError('');
    try {
      const next = webhooks.filter(w => w.id !== id);
      await persistWebhooks(next);
      setWebhooks(next);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const maskUrl = (url: string) => {
    if (url.length <= 16) return '••••••••••••••••';
    return url.slice(0, 30) + '••••••••' + url.slice(-8);
  };

  const canAdd = newName.trim() && newUrl.trim().startsWith('https://');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Slack 웹훅 관리</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">채널별 웹훅 URL을 등록하고 기능에서 선택해 사용하세요</p>
          </div>
          {!loading && (
            webhooks.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{webhooks.length}개 채널
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
              <div className="w-6 h-6 border-2 border-slate-200 border-t-[#4A154B] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* 웹훅 목록 */}
              {webhooks.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                  <p className="text-xs font-medium">등록된 웹훅 채널이 없습니다</p>
                  <p className="text-[11px] mt-1">아래 양식으로 첫 번째 채널을 추가하세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooks.map(webhook => {
                    const connectedFeatures = KNOWN_CHANNELS[webhook.name] ?? [];
                    return (
                    <div key={webhook.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-slate-700">{webhook.name}</p>
                          {connectedFeatures.length > 0 ? (
                            connectedFeatures.map(f => (
                              <span key={f} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">{f}</span>
                            ))
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">미연결</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {masked[webhook.id] ? maskUrl(webhook.url) : webhook.url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMasked(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0"
                      >
                        {masked[webhook.id] ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(webhook.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  );
                  })}
                </div>
              )}

              {/* 채널 추가 폼 */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">채널 추가</p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">채널 이름</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="예: 상담알림, 긴급알림, 운영팀"
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A154B]/30 focus:border-[#4A154B] bg-slate-50 placeholder-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Webhook URL</label>
                  <div className="relative">
                    <input
                      type={newUrlMasked ? 'password' : 'text'}
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full text-xs font-mono px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A154B]/30 focus:border-[#4A154B] bg-slate-50 placeholder-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setNewUrlMasked(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {newUrlMasked ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                {saveError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    {saveError}
                  </p>
                )}
                <button
                  onClick={handleAdd}
                  disabled={!canAdd || adding}
                  className="w-full py-2.5 bg-[#4A154B] text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#611f69] transition-colors flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />저장 중...</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>채널 추가</>
                  )}
                </button>
              </div>

              {/* 표준 채널 안내 */}
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 space-y-2">
                <p className="text-[11px] font-bold text-indigo-700">표준 채널 이름</p>
                <p className="text-[11px] text-indigo-600">아래 이름으로 채널을 등록하면 해당 기능과 자동 연결됩니다.</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(KNOWN_CHANNELS).map(([name, features]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <code className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">{name}</code>
                      <span className="text-[10px] text-indigo-500">{features.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 암호화 안내 */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
                  <li>Webhook URL은 <strong>ENCv2 암호화</strong>되어 저장됩니다.</li>
                  <li>Slack 앱 설정에서 Incoming Webhooks를 활성화하세요.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SlackModal;
