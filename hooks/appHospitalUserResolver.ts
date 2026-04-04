import type { Dispatch, SetStateAction } from 'react';
import type { AppState, User } from '../types';
import { authService } from '../services/authService';
import { dbToUser } from '../services/mappers';
import { waitForWarmup } from '../services/cryptoUtils';

interface ResolvedHospitalUser {
  resolvedUser: User;
  hasDecryptedProfile: boolean;
}

interface ScheduleHospitalUserBackgroundDecryptParams {
  userId: string;
  setState: Dispatch<SetStateAction<AppState>>;
  logPrefix: string;
}

export async function loadResolvedHospitalUser(user: User): Promise<ResolvedHospitalUser> {
  const decryptedProfile = await waitForWarmup()
    .then(() => authService.getProfileById(undefined, { decrypt: true }))
    .catch(() => null);

  return {
    resolvedUser: decryptedProfile ? dbToUser(decryptedProfile) : user,
    hasDecryptedProfile: Boolean(decryptedProfile),
  };
}

export function scheduleHospitalUserBackgroundDecrypt({
  userId,
  setState,
  logPrefix,
}: ScheduleHospitalUserBackgroundDecryptParams) {
  waitForWarmup()
    .then(() => authService.getProfileById(undefined, { decrypt: true }))
    .then((decryptedProfile) => {
      if (!decryptedProfile) return;
      const decryptedUser = dbToUser(decryptedProfile);
      setState((prev) => {
        if (prev.user?.id !== userId) return prev;
        return { ...prev, user: decryptedUser };
      });
    })
    .catch((error) => {
      console.warn(logPrefix, error);
    });
}
