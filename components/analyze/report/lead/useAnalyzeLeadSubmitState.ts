import { useMemo } from 'react';

interface UseAnalyzeLeadSubmitStateParams {
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  isSubmittingLead: boolean;
}

interface UseAnalyzeLeadSubmitStateResult {
  missingDetailedFields: string[];
  leadSubmitDisabled: boolean;
  leadSubmitBlockReason: string;
}

export function useAnalyzeLeadSubmitState({
  leadEmail,
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
  isSubmittingLead,
}: UseAnalyzeLeadSubmitStateParams): UseAnalyzeLeadSubmitStateResult {
  return useMemo(() => {
    const missingDetailedFields = [
      !leadHospital ? '병원명' : '',
      !leadRegion ? '지역' : '',
      !leadContact ? '연락처' : '',
    ].filter(Boolean);

    const leadSubmitDisabled = isSubmittingLead
      || !leadEmail
      || (wantDetailedAnalysis && missingDetailedFields.length > 0);

    const leadSubmitBlockReason = !leadEmail
      ? '이메일을 입력하면 결과를 저장할 수 있습니다.'
      : wantDetailedAnalysis && missingDetailedFields.length > 0
        ? `${missingDetailedFields.join(', ')}을(를) 입력하면 요청할 수 있어요`
        : '';

    return {
      missingDetailedFields,
      leadSubmitDisabled,
      leadSubmitBlockReason,
    };
  }, [
    isSubmittingLead,
    leadContact,
    leadEmail,
    leadHospital,
    leadRegion,
    wantDetailedAnalysis,
  ]);
}
