import { useEffect } from 'react';
import type { AppState } from '../types';
import { isSystemAdminRole } from '../types';
import type { ReviewType } from '../services/reviewService';
import { reviewService } from '../services/reviewService';
import { supabase } from '../services/supabaseClient';

interface UseAppReviewPopupParams {
  user: AppState['user'];
  currentView: AppState['currentView'];
  reviewPopupType: ReviewType | null;
  setReviewPopupType: (value: ReviewType | null) => void;
}

export function useAppReviewPopup({
  user,
  currentView,
  reviewPopupType,
  setReviewPopupType,
}: UseAppReviewPopupParams) {
  useEffect(() => {
    if (!user || currentView !== 'dashboard' || reviewPopupType) return;
    if (isSystemAdminRole(user.role, user.email)) return;

    supabase.auth.getUser().then(({ data }) => {
      const accountCreatedAt = data.user?.created_at;
      if (!accountCreatedAt) return;
      reviewService.checkWritable(user.id, accountCreatedAt).then(status => {
        if (status.canInitial && !reviewService.isSnoozed(user.id, 'initial')) {
          setReviewPopupType('initial');
        } else if (status.can6Month && !reviewService.isSnoozed(user.id, '6month')) {
          setReviewPopupType('6month');
        }
      }).catch(() => { });
    }).catch(() => { });
  }, [currentView, reviewPopupType, setReviewPopupType, user]);
}
