import type { Dispatch, SetStateAction } from 'react';
import type { AppState, User } from '../types';
import {
  buildNoHospitalState,
  buildPausedState,
} from './appStatePresets';
import { canAccessHospitalWorkspace } from './appHospitalAccess';

interface HandleHospitalLoadGuardParams {
  user: User;
  setState: Dispatch<SetStateAction<AppState>>;
  onBackgroundDecrypt: (userId: string) => void;
}

export function handleHospitalLoadGuard({
  user,
  setState,
  onBackgroundDecrypt,
}: HandleHospitalLoadGuardParams): boolean {
  if (user.status === 'paused') {
    setState(prev => buildPausedState(prev, user));
    onBackgroundDecrypt(user.id);
    return true;
  }

  if (!canAccessHospitalWorkspace(user)) {
    setState(prev => buildNoHospitalState(prev, user));
    onBackgroundDecrypt(user.id);
    return true;
  }

  return false;
}
