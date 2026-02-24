import React, { useMemo, useState } from 'react';
import { BillingProgram, BILLING_PROGRAM_LABELS } from '../types';

interface BillingProgramGateProps {
  canConfigure: boolean;
  isSaving: boolean;
  errorMessage: string;
  onSubmit: (program: BillingProgram) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
}

type BillingProgramOption = {
  value: BillingProgram;
  description: string;
  enabled: boolean;
  badge: string;
};

const PROGRAM_OPTIONS: BillingProgramOption[] = [
  {
    value: 'dentweb',
    description: '현재 지원 중입니다. 덴트웹 엑셀 구조 기준으로 분석/업로드 로직이 적용됩니다.',
    enabled: true,
    badge: '지원 중',
  },
  {
    value: 'oneclick',
    description: '준비 중입니다. 지원 전까지는 덴트웹 선택 후 이용해 주세요.',
    enabled: false,
    badge: '준비 중',
  },
];

const BillingProgramGate: React.FC<BillingProgramGateProps> = ({
  canConfigure,
  isSaving,
  errorMessage,
  onSubmit,
  onRefresh,
  onSignOut,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<BillingProgram>('dentweb');
  const selectedOption = useMemo(
    () => PROGRAM_OPTIONS.find(option => option.value === selectedProgram) ?? PROGRAM_OPTIONS[0],
    [selectedProgram],
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/70 rounded-3xl p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.16em]">Workspace Setup</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            청구프로그램 선택 후 워크스페이스를 시작합니다
          </h1>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            선택한 청구프로그램 기준으로 파일 파싱/정규화 로직이 적용됩니다.
            <br />
            설정 완료 전에는 워크스페이스에 진입할 수 없습니다.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-4">
          <p className="text-sm font-black text-indigo-900">초기 셋팅 안내</p>
          <p className="mt-1 text-xs text-indigo-800 leading-relaxed">
            프로그램 선택 후 시작 가이드를 따라 재고조사까지 진행해야 하며,
            초기 셋팅은 보통 30~40분이 소요됩니다.
          </p>
          <p className="mt-2 text-xs text-indigo-800 leading-relaxed">
            원활한 진행을 위해 사전 재고조사를 준비하거나,
            스마트폰으로 현장 실사를 하면서 바로 입력해 주세요.
          </p>
        </div>

        {!canConfigure ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
            <p className="text-sm font-bold text-amber-900">관리자 설정이 필요합니다.</p>
            <p className="text-xs text-amber-800">
              병원 관리자(master)가 청구프로그램을 선택해야 워크스페이스가 열립니다.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => { void onRefresh(); }}
                className="px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                다시 확인
              </button>
              <button
                type="button"
                onClick={() => { void onSignOut(); }}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {PROGRAM_OPTIONS.map(option => {
                const active = selectedProgram === option.value;
                return (
                  <label
                    key={option.value}
                    className={`block rounded-2xl border px-4 py-4 transition-colors ${
                      option.enabled
                        ? active
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="billing-program"
                        checked={active}
                        disabled={!option.enabled || isSaving}
                        onChange={() => setSelectedProgram(option.value)}
                        className="mt-1 h-4 w-4 accent-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-black ${option.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                            {BILLING_PROGRAM_LABELS[option.value]}
                          </p>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              option.enabled
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {option.badge}
                          </span>
                        </div>
                        <p className={`mt-1 text-xs leading-relaxed ${option.enabled ? 'text-slate-500' : 'text-slate-400'}`}>
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {errorMessage && (
              <p className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {errorMessage}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { void onSubmit(selectedProgram); }}
                disabled={!selectedOption.enabled || isSaving}
                className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
                  !selectedOption.enabled || isSaving
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isSaving ? '저장 중...' : '선택 후 워크스페이스 시작'}
              </button>
              <button
                type="button"
                onClick={() => { void onSignOut(); }}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60"
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingProgramGate;
