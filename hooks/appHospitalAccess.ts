import type { User } from '../types';
import { isSystemAdminRole } from '../types';

export function canAccessHospitalWorkspace(user: User) {
  if (user.status === 'paused') return false;
  if (!user.hospitalId) return false;

  const isAdminRole = isSystemAdminRole(user.role, user.email);
  return isAdminRole || user.status === 'active' || user.status === 'readonly';
}
