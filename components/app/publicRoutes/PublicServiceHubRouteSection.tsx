import React from 'react';
import type { HospitalPlanState, User, View } from '../../../types';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import HomepageFooter from '../../home/HomepageFooter';

const MyPage = lazyWithRetry(() => import('../../MyPage'));
const ServiceAdminPage = lazyWithRetry(() => import('../../ServiceAdminPage'));

interface PublicServiceHubRouteSectionProps {
  currentView: View;
  user: User | null;
  hospitalName: string;
  isSystemAdmin: boolean;
  planState: HospitalPlanState | null;
  userCreditBalance?: number;
  onNavigate: (view: View) => void;
  onHandleNavigate: (view: View) => void;
  onProfileClick: () => void;
  onLogout: () => void | Promise<void>;
}

const PublicServiceHubRouteSection: React.FC<PublicServiceHubRouteSectionProps> = ({
  currentView,
  user,
  hospitalName,
  isSystemAdmin,
  planState,
  userCreditBalance = 0,
  onNavigate,
  onHandleNavigate,
  onProfileClick,
  onLogout,
}) => {
  if (currentView === 'mypage' && user) {
    return (
      <>
        <MyPage
          user={user}
          hospitalName={hospitalName}
          planState={planState}
          userCreditBalance={userCreditBalance}
          onGoToDashboard={() => onHandleNavigate('dashboard')}
          onGoToInventoryHome={() => onHandleNavigate('landing')}
          onGoToPricing={() => onHandleNavigate('pricing')}
          onGoToContact={() => onHandleNavigate('contact')}
          onProfileClick={onProfileClick}
          onLogout={onLogout}
        />
        <HomepageFooter
          onGoToContact={() => onHandleNavigate('contact')}
          onGoToTerms={() => onHandleNavigate('terms')}
          onGoToPrivacy={() => onHandleNavigate('privacy')}
        />
      </>
    );
  }

  if (currentView === 'admin_panel' && isSystemAdmin && user) {
    return (
      <>
        <ServiceAdminPage />
        <HomepageFooter
          onGoToContact={() => onHandleNavigate('contact')}
          onGoToTerms={() => onHandleNavigate('terms')}
          onGoToPrivacy={() => onHandleNavigate('privacy')}
        />
      </>
    );
  }

  void onNavigate;
  return null;
};

export default PublicServiceHubRouteSection;
