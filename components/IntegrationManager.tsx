import React, { useEffect, useState } from 'react';
import { HospitalIntegration, IntegrationConfig, IntegrationProvider } from '../types';
import { integrationService } from '../services/integrationService';
import { useEscapeKey } from '../hooks/useEscapeKey';

// ── 마스킹 유틸 ──────────────────────────────────────────────────
function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '●'.repeat(value.length);
  return '●'.repeat(Math.min(value.length - 4, 12)) + value.slice(-4);
}

// ── 서비스 정의 ──────────────────────────────────────────────────
type FieldDef = { key: string; label: string; placeholder: string; type: 'text' | 'secret' };

interface ProviderDef {
  id: IntegrationProvider;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  fields: FieldDef[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'notion',
    name: 'Notion',
    description: '상담 예약·수술 기록 동기화',
    color: 'text-slate-800',
    bgColor: 'bg-slate-100',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
      </svg>
    ),
    fields: [
      { key: 'api_token', label: 'API Token', placeholder: 'ntn_...', type: 'secret' },
      { key: 'database_id', label: 'Database ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: '재고·수술 알림 전송',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', type: 'secret' },
    ],
  },
  {
    id: 'solapi',
    name: 'Solapi',
    description: 'SMS·알림톡 발송',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'NCS...', type: 'secret' },
      { key: 'api_secret', label: 'API Secret', placeholder: '', type: 'secret' },
    ],
  },
];

// ── Props ────────────────────────────────────────────────────────
interface IntegrationManagerProps {
  hospitalId: string;
  onClose: () => void;
  onIntegrationCountChange?: (count: number) => void;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
const IntegrationManager: React.FC<IntegrationManagerProps> = ({
  hospitalId,
  onClose,
  onIntegrationCountChange,
}) => {
  const [integrations, setIntegrations] = useState<HospitalIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<IntegrationProvider | null>(null);

  // 폼 상태
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntegrationProvider | null>(null);

  useEscapeKey(onClose);

  // 목록 로드
  useEffect(() => {
    void loadIntegrations();
  }, [hospitalId]);

  async function loadIntegrations() {
    setLoading(true);
    const data = await integrationService.getIntegrations(hospitalId);
    setIntegrations(data);
    onIntegrationCountChange?.(data.filter(i => i.is_active).length);
    setLoading(false);
  }

  // 서비스 카드 클릭: 폼 토글 + 기존 값 복호화
  async function handleToggleExpand(provider: IntegrationProvider) {
    if (expandedProvider === provider) {
      setExpandedProvider(null);
      setFormConfig({});
      setShowSecrets({});
      setTestResult(null);
      return;
    }

    setExpandedProvider(provider);
    setFormConfig({});
    setShowSecrets({});
    setTestResult(null);

    const existing = integrations.find(i => i.provider === provider);
    if (existing) {
      const decrypted = await integrationService.decryptConfig(existing.config);
      if (decrypted) {
        setFormConfig(decrypted as unknown as Record<string, string>);
      }
    }
  }

  // 저장
  async function handleSave(provider: IntegrationProvider) {
    setIsSaving(true);
    setTestResult(null);
    const ok = await integrationService.upsertIntegration(
      hospitalId,
      provider,
      formConfig as unknown as IntegrationConfig,
    );
    if (ok) {
      await loadIntegrations();
      setExpandedProvider(null);
      setFormConfig({});
    } else {
      setTestResult({ ok: false, message: '저장에 실패했습니다. 다시 시도해 주세요.' });
    }
    setIsSaving(false);
  }

  // 연결 테스트
  async function handleTest(provider: IntegrationProvider) {
    setIsTesting(true);
    setTestResult(null);
    const result = await integrationService.testConnection(provider, formConfig as unknown as IntegrationConfig);
    setTestResult(result);
    setIsTesting(false);
  }

  // 연결 해제 확인 → 삭제
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const ok = await integrationService.deleteIntegration(hospitalId, deleteTarget);
    if (ok) {
      await loadIntegrations();
      if (expandedProvider === deleteTarget) {
        setExpandedProvider(null);
        setFormConfig({});
      }
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  }

  const connectedProviders = new Set(integrations.filter(i => i.is_active).map(i => i.provider));

  // 폼 필드가 모두 채워졌는지
  function isFormValid(providerDef: ProviderDef): boolean {
    return providerDef.fields.every(f => (formConfig[f.key] ?? '').trim().length > 0);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">인테그레이션</h2>
              <p className="text-xs text-slate-400 font-medium">외부 서비스와 연동합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            PROVIDERS.map(p => {
              const isConnected = connectedProviders.has(p.id);
              const isExpanded = expandedProvider === p.id;

              return (
                <div key={p.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-indigo-200 shadow-sm' : 'border-slate-200'}`}>
                  {/* 서비스 행 */}
                  <button
                    onClick={() => void handleToggleExpand(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${p.bgColor} ${p.color}`}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{p.name}</span>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            연결됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                            미연결
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{p.description}</p>
                    </div>
                    <svg className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* 폼 (펼침 시) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                      {p.fields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-bold text-slate-600 block mb-1">{field.label}</label>
                          <div className="relative">
                            <input
                              type={field.type === 'secret' && !showSecrets[field.key] ? 'password' : 'text'}
                              value={formConfig[field.key] ?? ''}
                              onChange={e => setFormConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={
                                isConnected && !formConfig[field.key]
                                  ? maskSecret('placeholder')
                                  : field.placeholder
                              }
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-colors pr-9 font-mono"
                              autoComplete="off"
                            />
                            {field.type === 'secret' && (
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showSecrets[field.key] ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* 테스트 결과 */}
                      {testResult && (
                        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {testResult.ok
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
                          </svg>
                          {testResult.message}
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => void handleTest(p.id)}
                          disabled={isTesting || !isFormValid(p)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                          {isTesting ? '테스트 중...' : '연결 테스트'}
                        </button>
                        <button
                          onClick={() => void handleSave(p.id)}
                          disabled={isSaving || !isFormValid(p)}
                          className="px-3 py-1.5 text-xs font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
                        >
                          {isSaving ? '저장 중...' : '저장'}
                        </button>
                        {isConnected && (
                          <button
                            onClick={() => setDeleteTarget(p.id)}
                            disabled={isDeleting}
                            className="ml-auto px-3 py-1.5 text-xs font-bold text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-40"
                          >
                            연결 해제
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            닫기
          </button>
        </div>
      </div>

      {/* 연결 해제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-black text-slate-800 mb-2">연결 해제</h3>
            <p className="text-sm text-slate-500 mb-6">
              <span className="font-bold">{PROVIDERS.find(p => p.id === deleteTarget)?.name}</span> 연동을 해제하시겠습니까? 저장된 API 키가 삭제됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                취소
              </button>
              <button
                onClick={() => void handleDeleteConfirm()}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-black text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-60"
              >
                {isDeleting ? '삭제 중...' : '연결 해제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationManager;
