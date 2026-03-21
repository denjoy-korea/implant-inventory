/** 병원 마스터 계정의 프로필 완성도 체크 */
export interface ProfileGaps {
  missingPhone: boolean;
  missingBizFile: boolean;
}

export function checkProfileGaps(params: {
  phone: string | null | undefined;
  bizFileUrl: string | null | undefined;
}): ProfileGaps {
  return {
    missingPhone: !params.phone,
    missingBizFile: !params.bizFileUrl,
  };
}

export function hasProfileGaps(gaps: ProfileGaps): boolean {
  return gaps.missingPhone || gaps.missingBizFile;
}
