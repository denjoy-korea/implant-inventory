import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from '../../../services/cryptoUtils';

// ── 타입 정의 ─────────────────────────────────────────────────────────────
interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  isSecret: boolean;
}

interface MappingRow {
  id: string;
  appField: string;
  notionColumn: string;
}

interface NotionColumn {
  name: string;
  type: string;
}

// ── 상수 ──────────────────────────────────────────────────────────────────
const NOTION_FIELDS: IntegrationField[] = [
  { key: 'notion_api_token',          label: 'Internal Integration Token', placeholder: 'secret_...', isSecret: true },
  { key: 'notion_consultation_db_id', label: '상담 DB 아이디',              placeholder: '32자리 Database ID', isSecret: false },
];

const APP_FIELDS = [
  { key: 'name',                label: '이름',        notionType: 'title' },
  { key: 'hospital_name',       label: '병원명',      notionType: 'rich_text' },
  { key: 'email',               label: '이메일',      notionType: 'email' },
  { key: 'contact',             label: '연락처',      notionType: 'phone_number' },
  { key: 'region',              label: '지역',        notionType: 'rich_text' },
  { key: 'preferred_date',      label: '선호 날짜',   notionType: 'date' },
  { key: 'preferred_time_slot', label: '선호 시간대', notionType: 'select' },
  { key: 'notes',               label: '추가 요청',   notionType: 'rich_text' },
  { key: 'status',              label: '상태',        notionType: 'status' },
  { key: 'created_at',          label: '신청 일시',   notionType: 'date' },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

// ── Notion 연동 모달 ───────────────────────────────────────────────────────
function NotionModal({ onClose }: { onClose: () => void }) {
  const [notionValues, setNotionValues] = useState<Record<string, string>>({});
  const [notionMasked, setNotionMasked] = useState<Record<string, boolean>>({});
  const [notionSaved,  setNotionSaved]  = useState<Record<string, boolean>>({});
  const [saveState,    setSaveState]    = useState<SaveState>('idle');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [loading,      setLoading]      = useState(true);

  const [mappingRows,       setMappingRows]       = useState<MappingRow[]>([]);
  const [notionColumns,     setNotionColumns]     = useState<NotionColumn[]>([]);
  const [mappingLoading,    setMappingLoading]    = useState(false);
  const [mappingSaveState,  setMappingSaveState]  = useState<SaveState>('idle');
  const [mappingErrorMsg,   setMappingErrorMsg]   = useState('');
  const [columnsFetched,    setColumnsFetched]    = useState(false);
  const [columnFetchError,  setColumnFetchError]  = useState('');

  const isConnected = !loading &&
    notionSaved['notion_api_token'] &&
    notionSaved['notion_consultation_db_id'];

  useEffect(() => { loadSavedValues(); }, []);

  const loadSavedValues = async () => {
    setLoading(true);
    try {
      const keys = [...NOTION_FIELDS.map(f => f.key), 'notion_field_mappings'];
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
          masked[field.key] = field.isSecret;
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

      const mappingRow = data?.find(r => r.key === 'notion_field_mappings');
      if (mappingRow) {
        const decrypted = await decryptPatientInfo(mappingRow.value).catch(() => '');
        try {
          const parsed: Record<string, string> = JSON.parse(decrypted);
          setMappingRows(
            Object.entries(parsed).map(([appField, notionColumn]) => ({
              id: crypto.randomUUID(), appField, notionColumn,
            }))
          );
        } catch { setMappingRows([]); }
      }
    } catch (err) {
      console.error('[NotionModal] load error:', err);
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
        await supabase.from('system_integrations')
          .upsert({ key: field.key, value: encrypted, label: field.label, updated_at: new Date().toISOString() });
      }
      setSaveState('success');
      await loadSavedValues();
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
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
      console.error('[NotionModal] delete error:', err);
    }
  };

  const fetchNotionColumns = async () => {
    setMappingLoading(true);
    setColumnFetchError('');
    try {
      const { data, error } = await supabase.functions.invoke('get-notion-db-schema');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNotionColumns(data.columns ?? []);
      setColumnsFetched(true);
    } catch (err) {
      console.error('[NotionModal] fetchNotionColumns error:', err);
      setColumnFetchError(err instanceof Error ? err.message : 'Notion 컬럼을 불러오지 못했습니다.');
    } finally {
      setMappingLoading(false);
    }
  };

  const saveMappings = async () => {
    setMappingSaveState('saving');
    setMappingErrorMsg('');
    try {
      const mappingObj: Record<string, string> = {};
      for (const row of mappingRows) {
        if (row.appField && row.notionColumn) mappingObj[row.appField] = row.notionColumn;
      }
      const encrypted = await encryptPatientInfo(JSON.stringify(mappingObj));
      await supabase.from('system_integrations')
        .upsert({ key: 'notion_field_mappings', value: encrypted, label: '노션 속성 매핑', updated_at: new Date().toISOString() });
      setMappingSaveState('success');
      setTimeout(() => setMappingSaveState('idle'), 2500);
    } catch (err) {
      setMappingErrorMsg(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
      setMappingSaveState('error');
    }
  };

  const allFilled = NOTION_FIELDS.every(f => notionValues[f.key]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 100 100" fill="currentColor">
              <path d="M6.55 6.3c3.18 2.57 4.37 2.37 10.34 1.98l56.2-3.38c1.19 0 .2-.99-.39-1.18L63.08.56C61.5.17 59.72 0 57.95 0L10.71 3.78C8.34 3.98 6 5.16 6.55 6.3zm3.58 13.09V73.8c0 3.18.79 4.77 3.78 5.16l62.77 3.58c2.97.39 3.97-.79 3.97-3.38V25.76c0-2.57-.99-3.97-3.18-3.77L13.92 19.01c-2.18.2-3.78 1.39-3.78 4.38zm59.97 3.17c.39 1.79 0 3.58-1.79 3.78l-2.97.59v43.64c-2.57 1.39-5.16 2.18-7.14 2.18-3.38 0-4.17-1-6.75-4.17L34.67 36.51v42.45l8.53 1.79s0 3.58-4.97 3.58L24.33 85.5c-.39-1-.2-3.38 1.39-3.77l3.58-.99V31.94l-4.97-.39c-.39-1.79.59-4.37 3.38-4.57l13.49-.99L56.76 51.8V11.13l-7.14-.79c-.39-2.18 1-3.77 3.38-3.97l13.49-.99.2.39c0 0-.99.79-1.39 2.97l.79 4.57z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Notion 연동 설정</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">상담 신청을 노션 DB에 자동 저장</p>
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

        {/* 모달 본문 (스크롤) */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── 연결 설정 섹션 ── */}
              <div className="px-5 py-5 space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">API 연결</p>
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
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={!allFilled || saveState === 'saving'}
                    className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    {saveState === 'saving' ? (
                      <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />암호화 저장 중...</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>암호화하여 저장</>
                    )}
                  </button>
                  {saveState === 'success' && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>저장 완료
                    </span>
                  )}
                  {saveState === 'error' && <span className="text-xs font-bold text-rose-600">{errorMsg}</span>}
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
                    <li>API Token과 DB ID는 <strong>ENCv2 암호화</strong>되어 저장됩니다.</li>
                    <li>Integration을 Notion DB에 연결(Connect) 해야 row가 생성됩니다.</li>
                  </ul>
                </div>
              </div>

              {/* ── 속성 매핑 섹션 (연결된 경우에만) ── */}
              {isConnected && (
                <div className="border-t border-slate-100 px-5 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">속성 매핑</p>
                    <button
                      onClick={fetchNotionColumns}
                      disabled={mappingLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      <svg className={`w-3.5 h-3.5 ${mappingLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                      {columnsFetched ? '새로고침' : 'Notion 컬럼 불러오기'}
                    </button>
                  </div>

                  {columnFetchError && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-600">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      {columnFetchError}
                    </div>
                  )}

                  {mappingRows.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs font-medium">매핑된 속성이 없습니다</p>
                      <p className="text-[11px] mt-1">
                        {columnsFetched ? '"속성 추가" 버튼으로 매핑을 추가하세요.' : '먼저 "Notion 컬럼 불러오기"를 클릭하세요.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <p className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">앱 필드</p>
                        <div className="w-4 shrink-0" />
                        <p className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Notion 컬럼</p>
                        <div className="w-8 shrink-0" />
                      </div>
                      {mappingRows.map(row => (
                        <div key={row.id} className="flex items-center gap-2">
                          <select
                            value={row.appField}
                            onChange={e => setMappingRows(prev => prev.map(r => r.id === row.id ? { ...r, appField: e.target.value } : r))}
                            className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <option value="">앱 필드 선택</option>
                            {APP_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </select>
                          <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                          </svg>
                          {columnsFetched ? (
                            <select
                              value={row.notionColumn}
                              onChange={e => setMappingRows(prev => prev.map(r => r.id === row.id ? { ...r, notionColumn: e.target.value } : r))}
                              className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                              <option value="">컬럼 선택</option>
                              {notionColumns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={row.notionColumn}
                              onChange={e => setMappingRows(prev => prev.map(r => r.id === row.id ? { ...r, notionColumn: e.target.value } : r))}
                              placeholder="Notion 컬럼명"
                              className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setMappingRows(prev => prev.filter(r => r.id !== row.id))}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMappingRows(prev => [...prev, { id: crypto.randomUUID(), appField: '', notionColumn: '' }])}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    속성 추가
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveMappings}
                      disabled={mappingSaveState === 'saving' || mappingRows.length === 0}
                      className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      {mappingSaveState === 'saving' ? (
                        <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />저장 중...</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>매핑 저장</>
                      )}
                    </button>
                    {mappingSaveState === 'success' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>저장 완료
                      </span>
                    )}
                    {mappingSaveState === 'error' && <span className="text-xs font-bold text-rose-600">{mappingErrorMsg}</span>}
                  </div>
                  <p className="text-[11px] text-slate-400">매핑이 없으면 기본 컬럼명(이름·병원명·이메일 등)으로 자동 전송됩니다.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 탭 (연동 카드 그리드) ────────────────────────────────────────────
export default function SystemAdminIntegrationsTab() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [notionConnected, setNotionConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // 연결 상태만 빠르게 조회 (카드 배지 표시용)
    supabase
      .from('system_integrations')
      .select('key')
      .in('key', ['notion_api_token', 'notion_consultation_db_id'])
      .then(({ data }) => {
        const keys = data?.map(r => r.key) ?? [];
        setNotionConnected(
          keys.includes('notion_api_token') && keys.includes('notion_consultation_db_id')
        );
      });
  }, [openModal]); // 모달 닫힐 때마다 상태 새로고침

  const integrations = [
    {
      id: 'notion',
      name: 'Notion',
      description: '상담 신청을 노션 DB에 자동 저장',
      connected: notionConnected,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="currentColor">
            <path d="M6.55 6.3c3.18 2.57 4.37 2.37 10.34 1.98l56.2-3.38c1.19 0 .2-.99-.39-1.18L63.08.56C61.5.17 59.72 0 57.95 0L10.71 3.78C8.34 3.98 6 5.16 6.55 6.3zm3.58 13.09V73.8c0 3.18.79 4.77 3.78 5.16l62.77 3.58c2.97.39 3.97-.79 3.97-3.38V25.76c0-2.57-.99-3.97-3.18-3.77L13.92 19.01c-2.18.2-3.78 1.39-3.78 4.38zm59.97 3.17c.39 1.79 0 3.58-1.79 3.78l-2.97.59v43.64c-2.57 1.39-5.16 2.18-7.14 2.18-3.38 0-4.17-1-6.75-4.17L34.67 36.51v42.45l8.53 1.79s0 3.58-4.97 3.58L24.33 85.5c-.39-1-.2-3.38 1.39-3.77l3.58-.99V31.94l-4.97-.39c-.39-1.79.59-4.37 3.38-4.57l13.49-.99L56.76 51.8V11.13l-7.14-.79c-.39-2.18 1-3.77 3.38-3.97l13.49-.99.2.39c0 0-.99.79-1.39 2.97l.79 4.57z"/>
          </svg>
        </div>
      ),
    },
    // 향후 추가될 연동 서비스들
    {
      id: 'coming_soon_1',
      name: 'Google Calendar',
      description: '상담 일정을 구글 캘린더에 자동 등록',
      connected: false,
      comingSoon: true,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'coming_soon_2',
      name: 'Slack',
      description: '새 상담 신청 알림을 슬랙으로 받기',
      connected: false,
      comingSoon: true,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">연동 설정</h2>
        <p className="text-xs text-slate-400 mt-0.5">외부 서비스와 연결하여 업무를 자동화하세요.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {integrations.map(item => (
          <button
            key={item.id}
            onClick={() => !item.comingSoon && setOpenModal(item.id)}
            disabled={item.comingSoon}
            className={`
              text-left bg-white rounded-2xl border p-4 transition-all
              ${item.comingSoon
                ? 'border-slate-100 opacity-60 cursor-not-allowed'
                : 'border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {item.logo}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-800">{item.name}</span>
                  {item.comingSoon ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">준비 중</span>
                  ) : item.connected === true ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />연결됨
                    </span>
                  ) : item.connected === false ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />미연결
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
            {!item.comingSoon && (
              <div className="flex justify-end mt-3">
                <span className="text-[11px] font-bold text-indigo-500 flex items-center gap-1">
                  설정
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {openModal === 'notion' && (
        <NotionModal onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
