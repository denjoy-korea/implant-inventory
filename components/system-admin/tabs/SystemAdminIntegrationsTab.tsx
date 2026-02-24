import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from '../../../services/cryptoUtils';

// ── 타입 정의 ─────────────────────────────────────────────────────────────
interface NotionDatabaseEntry {
  id: string;
  title: string;
  api_token: string;   // plain text (outer blob encrypted)
  db_id: string;       // plain text
  field_mappings: Record<string, string> | null;
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
  type ModalView = 'list' | 'form';

  const [view,      setView]      = useState<ModalView>('list');
  const [databases, setDatabases] = useState<NotionDatabaseEntry[]>([]);
  const [loading,   setLoading]   = useState(true);

  // 폼 상태
  const [editingEntry, setEditingEntry] = useState<NotionDatabaseEntry | null>(null);
  const [formTitle,    setFormTitle]    = useState('');
  const [formToken,    setFormToken]    = useState('');
  const [formDbId,     setFormDbId]     = useState('');
  const [tokenMasked,  setTokenMasked]  = useState(true);
  const [saveState,    setSaveState]    = useState<SaveState>('idle');
  const [errorMsg,     setErrorMsg]     = useState('');

  // 매핑 상태 (저장 후 표시)
  const [savedEntry,       setSavedEntry]       = useState<NotionDatabaseEntry | null>(null);
  const [mappingRows,      setMappingRows]      = useState<MappingRow[]>([]);
  const [notionColumns,    setNotionColumns]    = useState<NotionColumn[]>([]);
  const [mappingLoading,   setMappingLoading]   = useState(false);
  const [mappingSaveState, setMappingSaveState] = useState<SaveState>('idle');
  const [mappingErrorMsg,  setMappingErrorMsg]  = useState('');
  const [columnsFetched,   setColumnsFetched]   = useState(false);
  const [columnFetchError, setColumnFetchError] = useState('');

  useEffect(() => { loadDatabases(); }, []);

  const loadDatabases = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('system_integrations')
        .select('key, value')
        .in('key', ['notion_databases', 'notion_api_token', 'notion_consultation_db_id', 'notion_field_mappings']);

      const rowMap: Record<string, string> = {};
      for (const row of data ?? []) rowMap[row.key] = row.value;

      if (rowMap['notion_databases']) {
        const decrypted = await decryptPatientInfo(rowMap['notion_databases']).catch(() => '[]');
        setDatabases(JSON.parse(decrypted) as NotionDatabaseEntry[]);
      } else if (rowMap['notion_api_token'] && rowMap['notion_consultation_db_id']) {
        // 레거시 키 → 단일 항목으로 변환 표시
        const token = await decryptPatientInfo(rowMap['notion_api_token']).catch(() => '');
        const dbId  = await decryptPatientInfo(rowMap['notion_consultation_db_id']).catch(() => '');
        let fieldMappings: Record<string, string> | null = null;
        if (rowMap['notion_field_mappings']) {
          const json = await decryptPatientInfo(rowMap['notion_field_mappings']).catch(() => null);
          if (json) { try { fieldMappings = JSON.parse(json); } catch { /**/ } }
        }
        setDatabases([{ id: 'legacy', title: '상담 DB', api_token: token, db_id: dbId, field_mappings: fieldMappings }]);
      } else {
        setDatabases([]);
      }
    } catch (err) {
      console.error('[NotionModal] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistDatabases = async (dbs: NotionDatabaseEntry[]) => {
    const encrypted = await encryptPatientInfo(JSON.stringify(dbs));
    const { error } = await supabase.from('system_integrations').upsert({
      key: 'notion_databases', value: encrypted, label: 'Notion 데이터베이스 목록', updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    // 레거시 키 호환: 첫 번째 DB를 기존 키에도 저장 (Edge Function 호환)
    if (dbs.length > 0) {
      const first = dbs[0];
      const encToken = await encryptPatientInfo(first.api_token);
      const encDbId  = await encryptPatientInfo(first.db_id);
      await supabase.from('system_integrations').upsert({ key: 'notion_api_token', value: encToken, label: 'Notion API Token', updated_at: new Date().toISOString() });
      await supabase.from('system_integrations').upsert({ key: 'notion_consultation_db_id', value: encDbId, label: 'Notion Consultation DB ID', updated_at: new Date().toISOString() });
      if (first.field_mappings) {
        const encMap = await encryptPatientInfo(JSON.stringify(first.field_mappings));
        await supabase.from('system_integrations').upsert({ key: 'notion_field_mappings', value: encMap, label: '노션 속성 매핑', updated_at: new Date().toISOString() });
      }
    }
  };

  const openNewForm = () => {
    setEditingEntry(null);
    setFormTitle(''); setFormToken(''); setFormDbId('');
    setTokenMasked(true); setSaveState('idle'); setErrorMsg('');
    setSavedEntry(null); setMappingRows([]); setNotionColumns([]);
    setColumnsFetched(false); setColumnFetchError(''); setMappingSaveState('idle');
    setView('form');
  };

  const openEditForm = (entry: NotionDatabaseEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title); setFormToken(entry.api_token); setFormDbId(entry.db_id);
    setTokenMasked(true); setSaveState('idle'); setErrorMsg('');
    setSavedEntry(entry);
    setMappingRows(entry.field_mappings
      ? Object.entries(entry.field_mappings).map(([appField, notionColumn]) => ({ id: crypto.randomUUID(), appField, notionColumn }))
      : []
    );
    setNotionColumns([]); setColumnsFetched(false); setColumnFetchError(''); setMappingSaveState('idle');
    setView('form');
  };

  const handleSave = async () => {
    const title = formTitle.trim();
    const token = formToken.trim();
    const dbId  = formDbId.trim();
    if (!title || !token || !dbId) { setErrorMsg('제목, API Token, DB ID를 모두 입력하세요.'); return; }
    setSaveState('saving'); setErrorMsg('');
    try {
      const entry: NotionDatabaseEntry = {
        id: editingEntry?.id ?? crypto.randomUUID(),
        title, api_token: token, db_id: dbId,
        field_mappings: editingEntry?.field_mappings ?? null,
      };
      const next = editingEntry
        ? databases.map(d => d.id === editingEntry.id ? entry : d)
        : [...databases, entry];
      await persistDatabases(next);
      setDatabases(next);
      setEditingEntry(entry);
      setSavedEntry(entry);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
      setSaveState('error');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const next = databases.filter(d => d.id !== id);
      await persistDatabases(next);
      setDatabases(next);
      setView('list');
    } catch (err) {
      console.error('[NotionModal] delete error:', err);
    }
  };

  const fetchNotionColumns = async () => {
    setMappingLoading(true); setColumnFetchError('');
    try {
      const { data, error } = await supabase.functions.invoke('get-notion-db-schema');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNotionColumns(data.columns ?? []);
      setColumnsFetched(true);
    } catch (err) {
      setColumnFetchError(err instanceof Error ? err.message : 'Notion 컬럼을 불러오지 못했습니다.');
    } finally {
      setMappingLoading(false);
    }
  };

  const saveMappings = async () => {
    if (!savedEntry) return;
    setMappingSaveState('saving'); setMappingErrorMsg('');
    try {
      const mappingObj: Record<string, string> = {};
      for (const row of mappingRows) {
        if (row.appField && row.notionColumn) mappingObj[row.appField] = row.notionColumn;
      }
      const updatedEntry: NotionDatabaseEntry = {
        ...savedEntry,
        field_mappings: Object.keys(mappingObj).length ? mappingObj : null,
      };
      const next = databases.map(d => d.id === savedEntry.id ? updatedEntry : d);
      await persistDatabases(next);
      setDatabases(next);
      setSavedEntry(updatedEntry);
      setEditingEntry(updatedEntry);
      setMappingSaveState('success');
      setTimeout(() => setMappingSaveState('idle'), 2500);
    } catch (err) {
      setMappingErrorMsg(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
      setMappingSaveState('error');
    }
  };

  const notionPath = 'M6.55 6.3c3.18 2.57 4.37 2.37 10.34 1.98l56.2-3.38c1.19 0 .2-.99-.39-1.18L63.08.56C61.5.17 59.72 0 57.95 0L10.71 3.78C8.34 3.98 6 5.16 6.55 6.3zm3.58 13.09V73.8c0 3.18.79 4.77 3.78 5.16l62.77 3.58c2.97.39 3.97-.79 3.97-3.38V25.76c0-2.57-.99-3.97-3.18-3.77L13.92 19.01c-2.18.2-3.78 1.39-3.78 4.38zm59.97 3.17c.39 1.79 0 3.58-1.79 3.78l-2.97.59v43.64c-2.57 1.39-5.16 2.18-7.14 2.18-3.38 0-4.17-1-6.75-4.17L34.67 36.51v42.45l8.53 1.79s0 3.58-4.97 3.58L24.33 85.5c-.39-1-.2-3.38 1.39-3.77l3.58-.99V31.94l-4.97-.39c-.39-1.79.59-4.37 3.38-4.57l13.49-.99L56.76 51.8V11.13l-7.14-.79c-.39-2.18 1-3.77 3.38-3.97l13.49-.99.2.39c0 0-.99.79-1.39 2.97l.79 4.57z';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          {view === 'form' ? (
            <button
              onClick={() => setView('list')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 100 100" fill="currentColor"><path d={notionPath}/></svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">
              {view === 'list' ? 'Notion 연동' : (editingEntry ? `${editingEntry.title} 설정` : '새 데이터베이스 연결')}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {view === 'list' ? '연결된 Notion 데이터베이스를 관리합니다' : '상담 신청을 노션 DB에 자동 저장'}
            </p>
          </div>
          {view === 'list' && !loading && (
            databases.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{databases.length}개 DB
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
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : view === 'list' ? (
            /* ── 리스트 뷰 ── */
            <div className="px-5 py-5 space-y-3">
              {databases.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-30" viewBox="0 0 100 100" fill="currentColor"><path d={notionPath}/></svg>
                  <p className="text-xs font-medium">연결된 데이터베이스가 없습니다</p>
                  <p className="text-[11px] mt-1">아래 버튼으로 첫 번째 DB를 연결하세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {databases.map(db => (
                    <button
                      key={db.id}
                      onClick={() => openEditForm(db)}
                      className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 100 100" fill="currentColor"><path d={notionPath}/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700">{db.title}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {db.db_id ? db.db_id.slice(0, 8) + '••••••••' + db.db_id.slice(-4) : '—'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />연결됨
                      </span>
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* 새 DB 연결 버튼 */}
              <button
                onClick={openNewForm}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                새로운 데이터베이스 연결
              </button>

              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside">
                  <li>API Token과 DB ID는 <strong>ENCv2 암호화</strong>되어 저장됩니다.</li>
                  <li>Integration을 Notion DB에 연결(Connect) 해야 row가 생성됩니다.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* ── 폼 뷰 ── */
            <div className="px-5 py-5 space-y-4">
              {/* DB 제목 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">DB 제목</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="예: 상담 신청 DB, 세일즈 DB"
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 placeholder-slate-300"
                />
              </div>

              {/* API Token */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Notion API Token</label>
                <div className="relative">
                  <input
                    type={tokenMasked ? 'password' : 'text'}
                    value={formToken}
                    onChange={e => setFormToken(e.target.value)}
                    placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full text-xs font-mono px-3 py-2.5 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 placeholder-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setTokenMasked(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {tokenMasked ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* DB ID */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Database ID</label>
                <input
                  type="text"
                  value={formDbId}
                  onChange={e => setFormDbId(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full text-xs font-mono px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 placeholder-slate-300"
                />
              </div>

              {/* 저장 / 삭제 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!formTitle.trim() || !formToken.trim() || !formDbId.trim() || saveState === 'saving'}
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
                {editingEntry && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(editingEntry.id)}
                    className="ml-auto p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                )}
              </div>

              {/* ── 속성 매핑 (저장 후 표시) ── */}
              {savedEntry && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slack 웹훅 모달 ────────────────────────────────────────────────────────
interface SlackWebhook {
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
  const [newName,   setNewName]   = useState('');
  const [newUrl,    setNewUrl]    = useState('');
  const [adding,    setAdding]    = useState(false);
  const [masked,    setMasked]    = useState<Record<string, boolean>>({});

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
                  <input
                    type="text"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full text-xs font-mono px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A154B]/30 focus:border-[#4A154B] bg-slate-50 placeholder-slate-300"
                  />
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

// ── 솔라피 자격증명 모달 ───────────────────────────────────────────────────
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

  const handleDelete = async () => {
    if (!confirm('솔라피 연동을 해제하시겠습니까?')) return;
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

  const maskValue = (v: string) => v.length <= 8 ? '••••••••' : v.slice(0, 4) + '••••••••' + v.slice(-4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">솔라피 API 관리</h2>
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
                    type="text"
                    value={keyMasked && apiKey ? maskValue(apiKey) : apiKey}
                    onChange={e => { if (!keyMasked) setApiKey(e.target.value); }}
                    onFocus={() => setKeyMasked(false)}
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
                    type="text"
                    value={secretMasked && apiSecret ? maskValue(apiSecret) : apiSecret}
                    onChange={e => { if (!secretMasked) setApiSecret(e.target.value); }}
                    onFocus={() => setSecretMasked(false)}
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
      </div>
    </div>
  );
}

// ── 메인 탭 (연동 카드 그리드) ────────────────────────────────────────────
export default function SystemAdminIntegrationsTab() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [notionConnected,  setNotionConnected]  = useState<boolean | null>(null);
  const [slackCount,       setSlackCount]       = useState<number | null>(null);
  const [solapiConnected,  setSolapiConnected]  = useState<boolean | null>(null);

  useEffect(() => {
    // 연결 상태만 빠르게 조회 (카드 배지 표시용)
    supabase
      .from('system_integrations')
      .select('key, value')
      .in('key', ['notion_databases', 'notion_api_token', 'notion_consultation_db_id', 'slack_webhooks', 'solapi_credentials'])
      .then(async ({ data }) => {
        const keys = data?.map(r => r.key) ?? [];
        setNotionConnected(
          keys.includes('notion_databases') ||
          (keys.includes('notion_api_token') && keys.includes('notion_consultation_db_id'))
        );
        const slackRow = data?.find(r => r.key === 'slack_webhooks');
        if (slackRow) {
          try {
            const decrypted = await decryptPatientInfo(slackRow.value).catch(() => '[]');
            const list: SlackWebhook[] = JSON.parse(decrypted);
            setSlackCount(list.length);
          } catch { setSlackCount(0); }
        } else {
          setSlackCount(0);
        }
        setSolapiConnected(keys.includes('solapi_credentials'));
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
    {
      id: 'slack',
      name: 'Slack',
      description: '웹훅 채널을 등록하고 알림을 자동화하세요',
      connected: slackCount !== null ? slackCount > 0 : null,
      channelCount: slackCount,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'solapi',
      name: '솔라피',
      description: 'SMS / 알림톡 발송 API 키를 안전하게 저장',
      connected: solapiConnected,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
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
                  ) : (item.channelCount !== undefined && item.channelCount !== null) ? (
                    item.channelCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{item.channelCount}개 채널
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />미연결
                      </span>
                    )
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
      {openModal === 'slack' && (
        <SlackModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'solapi' && (
        <SolapiModal onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
