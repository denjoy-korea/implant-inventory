import React from 'react';
import PublicInfoFooter from '../../shared/PublicInfoFooter';
import type {
  HospitalPlanState,
  PlanType,
  User,
  View,
} from '../../../types';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import type {
  ConsultationPrefill,
  PaymentRequestHandler,
  PlanSelectHandler,
} from '../publicShellRouteTypes';

const LandingPage = lazyWithRetry(() => import('../../LandingPage'));
const PricingPage = lazyWithRetry(() => import('../../PricingPage'));
const ContactPage = lazyWithRetry(() => import('../../ContactPage'));
const ValuePage = lazyWithRetry(() => import('../../ValuePage'));
const AnalyzePage = lazyWithRetry(() => import('../../AnalyzePage'));
const NoticeBoard = lazyWithRetry(() => import('../../NoticeBoard'));
const ReviewsPage = lazyWithRetry(() => import('../../ReviewsPage'));
const ConsultationPage = lazyWithRetry(() => import('../../ConsultationPage'));
const LegalPage = lazyWithRetry(() => import('../../shared/LegalPage'));

interface PublicSolutionRouteSectionProps {
  currentView: View;
  user: User | null;
  isSystemAdmin: boolean;
  isLoggedIn: boolean;
  planState: HospitalPlanState | null;
  consultationPrefill: ConsultationPrefill;
  onGetStartedWithPlan: (plan?: PlanType) => void;
  onGoToDenjoyLogin: () => void;
  onGoToDenjoySignup: (plan?: PlanType) => void;
  onHandleNavigate: (view: View) => void;
  onNavigate: (view: View) => void;
  onSetConsultationPrefill: React.Dispatch<React.SetStateAction<ConsultationPrefill>>;
  onPlanSelect?: PlanSelectHandler;
  onRequestPayment?: PaymentRequestHandler;
  onLogout: () => void | Promise<void>;
}

const PublicSolutionRouteSection: React.FC<PublicSolutionRouteSectionProps> = ({
  currentView,
  user,
  isSystemAdmin,
  isLoggedIn,
  planState,
  consultationPrefill,
  onGetStartedWithPlan,
  onGoToDenjoyLogin,
  onGoToDenjoySignup,
  onHandleNavigate,
  onNavigate,
  onSetConsultationPrefill,
  onPlanSelect,
  onRequestPayment,
  onLogout,
}) => {
  if (currentView === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => onGoToDenjoySignup()}
        onAnalyze={() => onHandleNavigate('analyze')}
        onGoToValue={() => onHandleNavigate('value')}
        onGoToPricing={() => onHandleNavigate('pricing')}
        onGoToNotices={() => onHandleNavigate('notices')}
        onGoToContact={() => onHandleNavigate('contact')}
      />
    );
  }

  if (currentView === 'pricing') {
    return (
      <PricingPage
        onContact={() => onHandleNavigate('contact')}
        onGoToValue={() => onHandleNavigate('value')}
        onGetStarted={onGetStartedWithPlan}
        currentPlan={planState?.plan}
        isLoggedIn={isLoggedIn}
        userName={user?.name}
        userPhone={user?.phone || ''}
        daysUntilExpiry={planState?.daysUntilExpiry}
        onSelectPlan={onPlanSelect}
        onRequestPayment={onRequestPayment}
      />
    );
  }

  if (currentView === 'contact') {
    return (
      <ContactPage
        user={user}
        onGoToLogin={onGoToDenjoyLogin}
        onGoToSignup={() => onGoToDenjoySignup()}
        onGoToContact={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onGoToAnalyze={() => onHandleNavigate('analyze')}
        onGoToTerms={() => onHandleNavigate('terms')}
        onGoToPrivacy={() => onHandleNavigate('privacy')}
        onNavigate={(view) => onHandleNavigate(view as View)}
        onGoToMyPage={() => onNavigate('mypage')}
        onGoToAdminPanel={isSystemAdmin ? () => onHandleNavigate('admin_panel') : undefined}
        onLogout={user ? onLogout : undefined}
      />
    );
  }

  if (currentView === 'value') {
    return (
      <ValuePage
        onGetStarted={() => onGoToDenjoySignup()}
        onContact={() => onHandleNavigate('contact')}
      />
    );
  }

  if (currentView === 'analyze') {
    return (
      <AnalyzePage
        onSignup={() => onGoToDenjoySignup()}
        onContact={(data) => {
          onSetConsultationPrefill(data);
          onHandleNavigate('consultation');
        }}
      />
    );
  }

  if (currentView === 'notices') {
    return (
      <>
        <div className="max-w-3xl mx-auto py-12 px-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">업데이트 소식</h1>
          <p className="text-slate-500 mb-8">DenJOY 서비스의 새로운 기능과 개선 사항을 확인하세요.</p>
          <NoticeBoard isAdmin={isSystemAdmin} fullPage />
        </div>
        <PublicInfoFooter showLegalLinks />
      </>
    );
  }

  if (currentView === 'reviews') {
    return <ReviewsPage onBack={() => onHandleNavigate('homepage')} />;
  }

  if (currentView === 'consultation') {
    return (
      <ConsultationPage
        onBack={() => onHandleNavigate('analyze')}
        initialEmail={consultationPrefill.email}
        initialHospitalName={consultationPrefill.hospitalName}
        initialRegion={consultationPrefill.region}
        initialContact={consultationPrefill.contact}
      />
    );
  }

  if (currentView === 'terms') {
    return <LegalPage type="terms" onBack={() => onHandleNavigate('homepage')} />;
  }

  if (currentView === 'privacy') {
    return <LegalPage type="privacy" onBack={() => onHandleNavigate('homepage')} />;
  }

  return null;
};

export default PublicSolutionRouteSection;
