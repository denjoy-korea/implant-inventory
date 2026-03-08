import React from 'react';
import ModalShell from '../shared/ModalShell';
import { DentwebAutomationState } from '../../services/dentwebAutomationService';

function formatDateTime(value: string | null): string {
  if (!value) return '기록 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '기록 없음';
  return date.toLocaleString('ko-KR', { hour12: false });
}

const STATUS_LABELS: Record<string, string> = {
  idle: '대기',
  running: '실행 중',
  success: '성공',
  no_data: '데이터 없음',
  failed: '실패',
};

interface DentwebAutomationModalProps {
  open: boolean;
  onClose: () => void;
  automationLoading: boolean;
  automationState: DentwebAutomationState | null;
  automationEnabled: boolean;
  onToggleAutomationEnabled: () => void;
  automationScheduledTime: string;
  onAutomationScheduledTimeChange: (value: string) => void;
  automationSaving: boolean;
  automationChanged: boolean;
  automationTimeValid: boolean;
  onSaveAutomation: () => void | Promise<void>;
  automationRunning: boolean;
  onRequestAutomationRun: () => void | Promise<void>;
  generatingToken: boolean;
  onGenerateToken: () => void | Promise<void>;
  newAgentToken: string | null;
  tokenCopied: boolean;
  onCopyToken: (token: string) => void | Promise<void>;
}

const DentwebAutomationModal: React.FC<DentwebAutomationModalProps> = ({
  open,
  onClose,
  automationLoading,
  automationState,
  automationEnabled,
  onToggleAutomationEnabled,
  automationScheduledTime,
  onAutomationScheduledTimeChange,
  automationSaving,
  automationChanged,
  automationTimeValid,
  onSaveAutomation,
  automationRunning,
  onRequestAutomationRun,
  generatingToken,
  onGenerateToken,
  newAgentToken,
  tokenCopied,
  onCopyToken,
}) => {
  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      title="덴트웹 자동화"
      maxWidth="max-w-lg"
      className="p-6 max-h-[85vh] overflow-y-auto"
    >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a6.75 6.75 0 100 13.5h4.5A5.25 5.25 0 1014.25 6h-.25A6.73 6.73 0 009.75 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">덴트웹 자동화</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {automationLoading ? (
          <p className="text-sm text-slate-400 py-8 text-center">설정 불러오는 중...</p>
        ) : (
          <div className="space-y-4">
            {/* 자동 실행 토글 */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="text-sm font-bold text-slate-700">자동 실행</label>
              <button
                type="button"
                role="switch"
                aria-checked={automationEnabled}
                onClick={onToggleAutomationEnabled}
                className={`relative h-6 w-11 rounded-full transition-colors ${automationEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${automationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* 실행 시간 */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">실행 시간</label>
              <input
                type="time"
                value={automationScheduledTime}
                onChange={(event) => onAutomationScheduledTimeChange(event.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">매일 설정한 시간에 자동으로 실행됩니다.</p>
            </div>

            {/* 버튼 영역 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void onSaveAutomation()}
                disabled={automationSaving || !automationChanged || !automationTimeValid}
                className="px-3 py-2.5 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
              >
                {automationSaving ? '저장 중...' : '설정 저장'}
              </button>
              <button
                onClick={() => void onRequestAutomationRun()}
                disabled={automationRunning}
                className="px-3 py-2.5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40"
              >
                {automationRunning ? '요청 중...' : '지금 실행 요청'}
              </button>
            </div>

            {/* 상태 정보 */}
            {automationState && (
              <div className="rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 space-y-1.5">
                <p className="text-[11px] text-slate-500">
                  최근 실행: <span className="font-semibold text-slate-700">{formatDateTime(automationState.lastRunAt)}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  상태:
                  <span
                    className={`ml-1 font-semibold ${
                      automationState.lastStatus === 'success'
                        ? 'text-emerald-600'
                        : automationState.lastStatus === 'running'
                          ? 'text-blue-600'
                          : automationState.lastStatus === 'no_data'
                            ? 'text-slate-600'
                            : automationState.lastStatus === 'failed'
                              ? 'text-rose-600'
                              : 'text-slate-500'
                    }`}
                  >
                    {STATUS_LABELS[automationState.lastStatus] ?? automationState.lastStatus}
                  </span>
                </p>
                {automationState.lastMessage && <p className="text-[11px] text-slate-500 truncate">메시지: {automationState.lastMessage}</p>}
                {automationState.manualRunRequested && <p className="text-[11px] text-amber-600 font-semibold">수동 실행 요청 대기 중</p>}
                <p className="text-[11px] text-slate-500">
                  에이전트 연결:{' '}
                  <span className={`font-semibold ${automationState.hasAgentToken ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {automationState.hasAgentToken ? `연결됨 (${automationState.agentTokenMasked})` : '미연결'}
                  </span>
                </p>
              </div>
            )}

            {/* 구분선 */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">에이전트 설치</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* 에이전트 다운로드 + 토큰 */}
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                병원 PC에서 에이전트를 다운로드하여 실행하면, 토큰 입력 후 자동으로 덴트웹과 연동됩니다.
              </p>
              <a
                href="https://github.com/denjoy-korea/dentweb-agent/releases/latest/download/dentweb-agent.exe"
                download
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                에이전트 다운로드 (Windows)
              </a>

              {automationState?.hasAgentToken && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">프로그램 실행 시 아래 토큰을 붙여넣으세요:</p>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <code className="flex-1 text-xs text-slate-800 font-mono truncate">{automationState.agentTokenMasked}</code>
                    {newAgentToken ? (
                      <button
                        onClick={() => void onCopyToken(newAgentToken)}
                        className="flex-shrink-0 px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                      >
                        {tokenCopied ? '복사됨' : '토큰 복사'}
                      </button>
                    ) : (
                      <button
                        onClick={() => void onGenerateToken()}
                        disabled={generatingToken}
                        className="flex-shrink-0 px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors disabled:opacity-40"
                      >
                        {generatingToken ? '재발급 중...' : '토큰 보기 (재발급)'}
                      </button>
                    )}
                  </div>
                  {newAgentToken && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <code className="flex-1 text-xs text-emerald-900 font-mono break-all select-all">{newAgentToken}</code>
                    </div>
                  )}
                  {!newAgentToken && <p className="text-[10px] text-slate-400">토큰 분실 시 재발급하세요. 기존 토큰은 즉시 무효화됩니다.</p>}
                </div>
              )}
            </div>
          </div>
        )}
    </ModalShell>
  );
};

export default DentwebAutomationModal;
