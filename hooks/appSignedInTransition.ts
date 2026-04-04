import { PlanType, isSystemAdminRole } from '../types';
import { authService } from '../services/authService';
import { planService } from '../services/planService';
import { dbToUser } from '../services/mappers';
import { supabase } from '../services/supabaseClient';
import { SESSION_TOKEN_KEY } from './useAppSessionPolling';

export async function waitForSignedInProfile() {
  const sessionEmail = (await authService.getSession().catch(() => null))?.user?.email ?? null;
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const profile = await authService.getProfileById(undefined, { decrypt: false });
    if (!profile) {
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      continue;
    }

    const hasHospitalLink = Boolean(profile.hospital_id);
    const canMissHospitalTemporarily = isSystemAdminRole(profile.role, sessionEmail ?? profile.email) || profile.status === 'pending';
    if (hasHospitalLink || canMissHospitalTemporarily || attempt === maxAttempts - 1) {
      return profile;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

interface CompleteSignedInTransitionParams {
  sessionEmail?: string | null;
  loadUserContext: (user: ReturnType<typeof dbToUser>) => Promise<void>;
  startSessionPolling: () => void;
}

export async function completeSignedInTransition({
  sessionEmail,
  loadUserContext,
  startSessionPolling,
}: CompleteSignedInTransitionParams) {
  const profile = await waitForSignedInProfile();
  if (!profile) return;

  let user = dbToUser(profile, sessionEmail);

  if (!user.hospitalId && localStorage.getItem('_pending_hospital_setup')) {
    const hospitalId = await authService.createHospitalForEmailConfirmed(profile.id);
    if (hospitalId) {
      const updatedProfile = await authService.getProfileById(undefined, { decrypt: false });
      if (updatedProfile) {
        user = dbToUser(updatedProfile, sessionEmail);
      }
    }
  }

  const pendingPlan = localStorage.getItem('_pending_trial_plan') as PlanType | null;
  if (pendingPlan && pendingPlan !== 'free' && user.hospitalId) {
    localStorage.removeItem('_pending_trial_plan');
    await planService.startTrial(user.hospitalId, pendingPlan);
  }

  await loadUserContext(user);

  if (!sessionStorage.getItem(SESSION_TOKEN_KEY)) {
    try {
      const token = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      await supabase.rpc('set_session_token', { p_token: token });
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } catch (error) {
      console.warn('[appSignedInTransition] social login session token setup failed:', error);
    }
  }

  startSessionPolling();
}
