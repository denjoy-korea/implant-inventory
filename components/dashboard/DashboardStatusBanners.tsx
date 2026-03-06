import React from 'react';
import type { HospitalPlanState } from '../../types';

interface DashboardTickerConfig {
  wrapperClass: string;
  tagClass: string;
  dotClass: string;
  tagText: string;
  textClass: string;
  message: string;
}

interface DashboardFomoData {
  surgeryCount: number;
  failOrderCount: number;
  inventoryCount: number;
}

interface DashboardStatusBannersProps {
  tickerConfig: DashboardTickerConfig;
  fomoData: DashboardFomoData | null;
  planState: HospitalPlanState | null;
  onUpgrade?: () => void;
}

const DashboardStatusBanners: React.FC<DashboardStatusBannersProps> = ({
  tickerConfig,
  fomoData,
  planState,
  onUpgrade,
}) => {
  return (
    <>
      {/* ── 수술기록 상태 티커 ─────────────────────────────────── */}
      <div className={`flex items-center rounded-2xl overflow-hidden border shadow-sm ${tickerConfig.wrapperClass}`}>
        {/* 상태 태그 */}
        <div className={`shrink-0 ${tickerConfig.tagClass} px-3.5 py-2.5 flex items-center gap-1.5`}>
          <div className={`w-1.5 h-1.5 rounded-full ${tickerConfig.dotClass} animate-pulse`} />
          <span className="text-[10px] font-black text-white tracking-widest">{tickerConfig.tagText}</span>
        </div>
        {/* 구분선 */}
        <div className="w-px self-stretch bg-current opacity-10" />
        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-hidden py-2.5">
          <div className="animate-news-ticker">
            <span className={`text-xs font-medium ${tickerConfig.textClass} pl-5 pr-16`}>{tickerConfig.message}</span>
            <span className={`text-xs ${tickerConfig.textClass} opacity-20 pr-16`}>◆ ◆ ◆</span>
            <span className={`text-xs font-medium ${tickerConfig.textClass} pr-16`}>{tickerConfig.message}</span>
            <span className={`text-xs ${tickerConfig.textClass} opacity-20 pr-16`}>◆ ◆ ◆</span>
          </div>
        </div>
      </div>

      {/* ── Free 플랜 FOMO 배너 ──────────────────────────────────── */}
      {fomoData && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* 왼쪽: 축적 데이터 수치 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md tracking-wide">FREE</span>
                <p className="text-xs font-bold text-indigo-800">지금까지 쌓인 데이터로 더 많은 것을 할 수 있어요</p>
              </div>
              {/* 축적 수치 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {fomoData.surgeryCount > 0 && (
                  <span className="px-2.5 py-1 bg-white/80 border border-indigo-100 rounded-lg text-[11px] font-bold text-slate-700">
                    수술기록 <span className="text-indigo-700">{fomoData.surgeryCount.toLocaleString()}건</span>
                  </span>
                )}
                <span className="px-2.5 py-1 bg-white/80 border border-indigo-100 rounded-lg text-[11px] font-bold text-slate-700">
                  재고 <span className="text-indigo-700">{fomoData.inventoryCount}종</span>
                </span>
                {fomoData.failOrderCount > 0 && (
                  <span className="px-2.5 py-1 bg-white/80 border border-rose-100 rounded-lg text-[11px] font-bold text-slate-700">
                    FAIL 미관리 <span className="text-rose-600">{fomoData.failOrderCount}건</span>
                  </span>
                )}
              </div>
              {/* 잠긴 기능 목록 */}
              <div className="flex flex-wrap gap-1.5">
                {['교환 관리', '발주 관리', '수술기록 분석'].map((label) => (
                  <span key={label} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-500">
                    <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    {label}
                  </span>
                ))}
                <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-500">Basic부터 해제</span>
              </div>
            </div>
            {/* 오른쪽: CTA */}
            {onUpgrade && (
              <div className="shrink-0">
                <button
                  onClick={onUpgrade}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-300 whitespace-nowrap"
                >
                  Basic 업그레이드 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 수술기록 만료 예고 배너 (Free 전환 유저) ──────────────── */}
      {planState?.retentionDaysLeft !== undefined && planState.retentionDaysLeft <= 30 && (
        <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 border ${
          planState.retentionDaysLeft <= 7
            ? 'bg-rose-50 border-rose-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${planState.retentionDaysLeft <= 7 ? 'text-rose-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black ${planState.retentionDaysLeft <= 7 ? 'text-rose-700' : 'text-amber-700'}`}>
              수술기록이 {planState.retentionDaysLeft}일 후 만료됩니다
            </p>
            <p className={`text-[11px] mt-0.5 ${planState.retentionDaysLeft <= 7 ? 'text-rose-600' : 'text-amber-600'}`}>
              Free 플랜 보관 기간(3개월)이 곧 종료됩니다. 플랜을 업그레이드하면 데이터가 영구 보존됩니다.
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className={`shrink-0 px-3 py-1.5 text-xs font-black rounded-lg text-white transition-colors ${
                planState.retentionDaysLeft <= 7 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              업그레이드
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default DashboardStatusBanners;
