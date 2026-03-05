import React from 'react';
import AnalyzeReportLeadFormCard from './lead/AnalyzeReportLeadFormCard';
import AnalyzeReportLeadInsightsCard from './lead/AnalyzeReportLeadInsightsCard';
import AnalyzeReportLeadSuccessCard from './lead/AnalyzeReportLeadSuccessCard';
import type { LeadSuccessCta } from './lead/leadTypes';

interface AnalyzeReportLeadSectionProps {
  quickInsights: string[];
  emailSent: boolean;
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  isSubmittingLead: boolean;
  leadSubmitError: string;
  updateLeadEmail: (value: string) => void;
  updateWantDetailedAnalysis: (value: boolean) => void;
  updateLeadHospital: (value: string) => void;
  updateLeadRegion: (value: string) => void;
  updateLeadContact: (value: string) => void;
  handleLeadSubmit: () => void;
  handleGoToConsultation: () => void;
  onSignup: () => void;
}

const AnalyzeReportLeadSection: React.FC<AnalyzeReportLeadSectionProps> = ({
  quickInsights,
  emailSent,
  leadEmail,
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
  isSubmittingLead,
  leadSubmitError,
  updateLeadEmail,
  updateWantDetailedAnalysis,
  updateLeadHospital,
  updateLeadRegion,
  updateLeadContact,
  handleLeadSubmit,
  handleGoToConsultation,
  onSignup,
}) => {
  const missingDetailedFields = [
    !leadHospital ? '병원명' : '',
    !leadRegion ? '지역' : '',
    !leadContact ? '연락처' : '',
  ].filter(Boolean);
  const leadSubmitDisabled = isSubmittingLead || !leadEmail || (wantDetailedAnalysis && missingDetailedFields.length > 0);
  const leadSubmitBlockReason = !leadEmail
    ? '이메일을 입력하면 결과를 저장할 수 있습니다.'
    : wantDetailedAnalysis && missingDetailedFields.length > 0
      ? `${missingDetailedFields.join(', ')}을(를) 입력하면 요청할 수 있어요`
      : '';

  const leadSuccessCta: LeadSuccessCta = wantDetailedAnalysis
    ? {
      title: '요청 접수 완료',
      eta: '담당자가 영업일 기준 1일 이내에 연락드립니다.',
      detail: '요청 내역이 정상 접수되었고 분석 리포트 텍스트는 클립보드에 복사되었습니다.',
      ctaLabel: '상담 일정 잡기',
      onClick: handleGoToConsultation,
    }
    : {
      title: '리포트 저장 완료',
      eta: '정식 서비스 전환 시점에 동일 이메일로 안내를 드립니다.',
      detail: '결과 요약이 클립보드에 복사되었습니다. 다음 단계로 자동 분석을 바로 시작할 수 있습니다.',
      ctaLabel: '무료로 시작하기',
      onClick: onSignup,
    };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-2xl mx-auto px-6 space-y-4">
        <AnalyzeReportLeadInsightsCard quickInsights={quickInsights} />

        {emailSent ? (
          <AnalyzeReportLeadSuccessCard leadSuccessCta={leadSuccessCta} />
        ) : (
          <AnalyzeReportLeadFormCard
            leadEmail={leadEmail}
            wantDetailedAnalysis={wantDetailedAnalysis}
            leadHospital={leadHospital}
            leadRegion={leadRegion}
            leadContact={leadContact}
            isSubmittingLead={isSubmittingLead}
            leadSubmitError={leadSubmitError}
            leadSubmitDisabled={leadSubmitDisabled}
            leadSubmitBlockReason={leadSubmitBlockReason}
            updateLeadEmail={updateLeadEmail}
            updateWantDetailedAnalysis={updateWantDetailedAnalysis}
            updateLeadHospital={updateLeadHospital}
            updateLeadRegion={updateLeadRegion}
            updateLeadContact={updateLeadContact}
            handleLeadSubmit={handleLeadSubmit}
          />
        )}
      </div>
    </section>
  );
};

export default AnalyzeReportLeadSection;
