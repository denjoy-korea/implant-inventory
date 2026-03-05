import React from 'react';
import AnalyzeReportLeadDetailRequestSection from './AnalyzeReportLeadDetailRequestSection';
import AnalyzeReportLeadEmailSection from './AnalyzeReportLeadEmailSection';
import AnalyzeReportLeadErrorPanel from './AnalyzeReportLeadErrorPanel';
import AnalyzeReportLeadIntro from './AnalyzeReportLeadIntro';

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
      <AnalyzeReportLeadIntro />

      <div className="space-y-3 max-w-sm mx-auto">
        <AnalyzeReportLeadEmailSection leadEmail={leadEmail} updateLeadEmail={updateLeadEmail} />
        <AnalyzeReportLeadDetailRequestSection
          wantDetailedAnalysis={wantDetailedAnalysis}
          leadHospital={leadHospital}
          leadRegion={leadRegion}
          leadContact={leadContact}
          updateWantDetailedAnalysis={updateWantDetailedAnalysis}
          updateLeadHospital={updateLeadHospital}
          updateLeadRegion={updateLeadRegion}
          updateLeadContact={updateLeadContact}
        />
        <AnalyzeReportLeadErrorPanel
          leadSubmitError={leadSubmitError}
          leadSubmitDisabled={leadSubmitDisabled}
          handleLeadSubmit={handleLeadSubmit}
          retryLabel="다시 전송"
        />

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
