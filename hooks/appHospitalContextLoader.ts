import { DEFAULT_WORK_DAYS } from '../types';
import type { User } from '../types';
import { hospitalService } from '../services/hospitalService';
import { planService } from '../services/planService';
import { onboardingService } from '../services/onboardingService';

export async function loadHospitalContextSnapshot(user: User) {
  const [memberCount, hospitalData, planState] = await Promise.all([
    hospitalService.getActiveMemberCount(user.hospitalId),
    hospitalService.getHospitalById(user.hospitalId),
    planService.checkPlanExpiry(user.hospitalId),
  ]);

  if (hospitalData?.onboardingFlags) {
    onboardingService.syncFromDbFlags(user.hospitalId, hospitalData.onboardingFlags);
  }

  return {
    planState,
    memberCount,
    hospitalName: hospitalData?.name || '',
    hospitalMasterAdminId: hospitalData?.masterAdminId || '',
    hospitalWorkDays: hospitalData?.workDays ?? DEFAULT_WORK_DAYS,
    hospitalBillingProgram: hospitalData?.billingProgram ?? null,
    hospitalBizFileUrl: hospitalData?.bizFileUrl ?? null,
  };
}
