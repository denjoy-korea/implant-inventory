import React from 'react';
import AnalyzeReportLeadDetailedFields from './AnalyzeReportLeadDetailedFields';

interface AnalyzeReportLeadFormCardProps {
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  isSubmittingLead: boolean;
  leadSubmitError: string;
  leadSubmitDisabled: boolean;
  leadSubmitBlockReason: string;
  updateLeadEmail: (value: string) => void;
  updateWantDetailedAnalysis: (value: boolean) => void;
  updateLeadHospital: (value: string) => void;
  updateLeadRegion: (value: string) => void;
  updateLeadContact: (value: string) => void;
  handleLeadSubmit: () => void;
}

const AnalyzeReportLeadFormCard: React.FC<AnalyzeReportLeadFormCardProps> = ({
  leadEmail,
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
  isSubmittingLead,
  leadSubmitError,
  leadSubmitDisabled,
  leadSubmitBlockReason,
  updateLeadEmail,
  updateWantDetailedAnalysis,
  updateLeadHospital,
  updateLeadRegion,
  updateLeadContact,
  handleLeadSubmit,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">분석 결과를 저장하고 다음 단계를 받아보세요</h3>
        <p className="text-sm text-slate-500">최소 입력(이메일)만으로 결과 저장이 가능합니다.</p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <label htmlFor="analyze-lead-email" className="block text-xs font-bold text-slate-500 mb-1">
          이메일 주소 *
        </label>
        <input
          id="analyze-lead-email"
          type="email"
          value={leadEmail}
          onChange={(e) => updateLeadEmail(e.target.value)}
          placeholder="이메일 주소 *"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-500">입력하신 이메일은 결과 전달 및 후속 안내 목적으로만 사용합니다.</p>

        <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={wantDetailedAnalysis}
            onChange={(e) => updateWantDetailedAnalysis(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <div>
            <span className="text-sm font-bold text-slate-800">상세 분석 및 입력환경 최적화 요청</span>
            <p className="text-xs text-slate-400 mt-0.5">현장 방문을 통한 정밀 재고 분석과 맞춤 입력환경을 제안해드립니다.</p>
          </div>
        </label>

        {wantDetailedAnalysis && (
          <AnalyzeReportLeadDetailedFields
            leadHospital={leadHospital}
            leadRegion={leadRegion}
            leadContact={leadContact}
            updateLeadHospital={updateLeadHospital}
            updateLeadRegion={updateLeadRegion}
            updateLeadContact={updateLeadContact}
          />
        )}

        {leadSubmitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 space-y-2">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{leadSubmitError}</span>
            </div>
            <button
              type="button"
              onClick={handleLeadSubmit}
              disabled={leadSubmitDisabled}
              className="w-full py-2 text-xs font-bold rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다시 전송
            </button>
          </div>
        )}

        <button
          onClick={handleLeadSubmit}
          disabled={leadSubmitDisabled}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmittingLead ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              전송 중...
            </>
          ) : (
            wantDetailedAnalysis ? '상세 분석 요청하기' : '분석결과 받기'
          )}
        </button>

        {leadSubmitBlockReason && !isSubmittingLead && (
          <p className="text-xs text-amber-600 text-center">{leadSubmitBlockReason}</p>
        )}
      </div>
    </div>
  );
};

export default AnalyzeReportLeadFormCard;
