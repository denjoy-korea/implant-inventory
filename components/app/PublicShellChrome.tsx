import React, { Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../Header';
import HomepageHeader from '../home/HomepageHeader';
import { PublicMobileNav } from '../PublicMobileNav';
import ErrorBoundary from '../ErrorBoundary';
import ConfirmModal from '../ConfirmModal';
import DowngradeMemberSelectModal from '../settings/DowngradeMemberSelectModal';
import type {
  BillingCycle,
  DashboardTab,
  HospitalPlanState,
  PlanType,
  User,
  View,
} from '../../types';
import { PLAN_NAMES } from '../../types';
import type { PublicShellDowngradeDiff, PublicShellMeta } from './publicShellMeta';

type PendingPlanChange = { plan: PlanType; billing: BillingCycle } | null;

interface PublicShellChromeProps {
  currentView: View;
  user: User | null;
  isSystemAdmin: boolean;
  isBrandPage: boolean;
  isServiceHubPage: boolean;
  usesHomepageHeader: boolean;
  hasPublicMobileBottomOffset: boolean;
  meta: PublicShellMeta;
  downgradePending: PendingPlanChange;
  downgradeDiff: PublicShellDowngradeDiff | null;
  downgradeCreditMsg?: string;
  memberSelectPending: PendingPlanChange;
  planState: HospitalPlanState | null;
  suspenseFallback: React.ReactNode;
  children: React.ReactNode;
  onNavigate: (view: View) => void;
  onTabNavigate: (tab: DashboardTab) => void;
  onProfileClick: () => void;
  onLogout: () => void | Promise<void>;
  onGoToDenjoyLogin: () => void;
  onGoToDenjoySignup: (plan?: PlanType) => void;
  onAnalyzeEntry: () => void;
  confirmDowngrade: () => Promise<void>;
  confirmMemberSelection: (memberIdsToSuspend: string[]) => Promise<void>;
  setDowngradePending: React.Dispatch<React.SetStateAction<PendingPlanChange>>;
  setMemberSelectPending: React.Dispatch<React.SetStateAction<PendingPlanChange>>;
}

const PublicShellChrome: React.FC<PublicShellChromeProps> = ({
  currentView,
  user,
  isSystemAdmin,
  isBrandPage,
  isServiceHubPage,
  usesHomepageHeader,
  hasPublicMobileBottomOffset,
  meta,
  downgradePending,
  downgradeDiff,
  downgradeCreditMsg,
  memberSelectPending,
  planState,
  suspenseFallback,
  children,
  onNavigate,
  onTabNavigate,
  onProfileClick,
  onLogout,
  onGoToDenjoyLogin,
  onGoToDenjoySignup,
  onAnalyzeEntry,
  confirmDowngrade,
  confirmMemberSelection,
  setDowngradePending,
  setMemberSelectPending,
}) => {
  return (
    <div className="h-full flex flex-col">
      {downgradePending && downgradeDiff && (
        <ConfirmModal
          title={`${PLAN_NAMES[planState?.plan ?? 'free']} → ${PLAN_NAMES[downgradePending.plan]} 다운그레이드`}
          message={downgradeDiff.message}
          tip={[downgradeDiff.tip, downgradeCreditMsg].filter(Boolean).join('\n') || undefined}
          confirmLabel="다음"
          cancelLabel="취소"
          confirmColor="amber"
          onConfirm={confirmDowngrade}
          onCancel={() => setDowngradePending(null)}
        />
      )}
      {memberSelectPending && user?.hospitalId && (
        <DowngradeMemberSelectModal
          hospitalId={user.hospitalId}
          newPlan={memberSelectPending.plan}
          onConfirm={confirmMemberSelection}
          onCancel={() => setMemberSelectPending(null)}
        />
      )}
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
      </Helmet>
      {usesHomepageHeader && (
        <>
          <HomepageHeader
            currentView={currentView}
            user={user}
            onGoToLogin={onGoToDenjoyLogin}
            onGoToSignup={() => onGoToDenjoySignup()}
            onGoToContact={() => onNavigate('contact')}
            onNavigate={(v) => onNavigate(v as View)}
            onGoToMyPage={user ? () => onNavigate('mypage') : undefined}
            onGoToAdminPanel={isSystemAdmin ? () => onNavigate('admin_panel') : undefined}
            onLogout={user ? onLogout : undefined}
          />
          <div className="h-[57px] sm:h-[60px] flex-shrink-0" />
        </>
      )}
      {!isBrandPage && !isServiceHubPage && (
        <>
          <Header
            onHomeClick={() => onNavigate('homepage')}
            onLoginClick={onGoToDenjoyLogin}
            onSignupClick={() => onGoToDenjoySignup()}
            onLogout={onLogout}
            onNavigate={onNavigate}
            onTabNavigate={onTabNavigate}
            onProfileClick={onProfileClick}
            user={user}
            currentView={currentView}
            showLogo={true}
          />
          <div className="h-[60px] sm:h-[64px] flex-shrink-0" />
          <PublicMobileNav
            currentView={currentView}
            onNavigate={onNavigate}
            onAnalyzeClick={onAnalyzeEntry}
          />
        </>
      )}
      <main className={`flex-1 overflow-x-hidden ${hasPublicMobileBottomOffset && !isBrandPage && !isServiceHubPage ? 'pb-36 xl:pb-0' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={suspenseFallback}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default PublicShellChrome;
