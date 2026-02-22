import React, { Suspense, lazy } from 'react';
import Header from '../Header';
import { PublicMobileNav } from '../PublicMobileNav';
import ErrorBoundary from '../ErrorBoundary';
import {
  BillingCycle,
  DashboardTab,
  HospitalPlanState,
  PlanType,
  PLAN_NAMES,
  User,
  View,
} from '../../types';
import { ToastType } from '../../hooks/useToast';
import { hospitalService } from '../../services/hospitalService';
import { makePaymentService } from '../../services/makePaymentService';
import { planService } from '../../services/planService';

const LandingPage = lazy(() => import('../LandingPage'));
const AuthForm = lazy(() => import('../AuthForm'));
const PricingPage = lazy(() => import('../PricingPage'));
const ContactPage = lazy(() => import('../ContactPage'));
const ValuePage = lazy(() => import('../ValuePage'));
const AnalyzePage = lazy(() => import('../AnalyzePage'));
const NoticeBoard = lazy(() => import('../NoticeBoard'));
const AdminPanel = lazy(() => import('../AdminPanel'));
const MfaOtpScreen = lazy(() => import('../MfaOtpScreen'));
const ReviewsPage = lazy(() => import('../ReviewsPage'));

interface InviteInfo {
  token: string;
  email: string;
  hospitalName: string;
  name: string;
}

interface PublicAppShellProps {
  currentView: View;
  user: User | null;
  isSystemAdmin: boolean;
  preSelectedPlan?: PlanType;
  planState: HospitalPlanState | null;
  inviteInfo: InviteInfo | null;
  mfaPendingEmail?: string;
  onNavigate: (view: View) => void;
  onTabNavigate: (tab: DashboardTab) => void;
  onProfileClick: () => void;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void | Promise<void>;
  onSetMfaPendingEmail: (email?: string) => void;
  onGetStartedWithPlan: (plan?: PlanType) => void;
  onPlanStateActivated: (planState: HospitalPlanState) => void;
  showAlertToast: (message: string, type: ToastType) => void;
}

const suspenseFallback = (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

const PublicAppShell: React.FC<PublicAppShellProps> = ({
  currentView,
  user,
  isSystemAdmin,
  preSelectedPlan,
  planState,
  inviteInfo,
  mfaPendingEmail,
  onNavigate,
  onTabNavigate,
  onProfileClick,
  onLoginSuccess,
  onLogout,
  onSetMfaPendingEmail,
  onGetStartedWithPlan,
  onPlanStateActivated,
  showAlertToast,
}) => {
  const isLoggedIn = !!user;

  const handlePlanSelect = user?.hospitalId
    ? async (plan: PlanType, billing: BillingCycle) => {
      try {
        const ok = await planService.changePlan(user.hospitalId!, plan, billing);
        if (ok) {
          const ps = await planService.getHospitalPlan(user.hospitalId!);
          onPlanStateActivated(ps);
          showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.`, 'success');
        } else {
          showAlertToast('플랜 변경 권한이 없습니다. 병원 관리자만 플랜을 변경할 수 있습니다.', 'error');
        }
      } catch (err) {
        console.error('[PublicAppShell] Plan change error:', err);
        showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
      }
    }
    : undefined;

  const handleRequestPayment = user?.hospitalId
    ? async (
      plan: PlanType,
      billing: BillingCycle,
      contactName: string,
      contactPhone: string,
      paymentMethod: 'card' | 'transfer',
      receiptType?: 'cash_receipt' | 'tax_invoice'
    ) => {
      try {
        const hospital = await hospitalService.getHospitalById(user.hospitalId!);
        const result = await makePaymentService.requestPayment({
          hospitalId: user.hospitalId!,
          hospitalName: hospital?.name || '',
          plan,
          billingCycle: billing,
          contactName,
          contactPhone,
          paymentMethod,
          receiptType,
        });

        if (result.success) {
          showAlertToast('결제 요청이 완료되었습니다. 입력하신 연락처로 결제 안내 문자가 발송됩니다.', 'success');
          const ps = await planService.getHospitalPlan(user.hospitalId!);
          onPlanStateActivated(ps);
          return true;
        }

        showAlertToast(result.error || '결제 요청에 실패했습니다. 다시 시도해주세요.', 'error');
        return false;
      } catch (err) {
        console.error('[PublicAppShell] Payment request error:', err);
        showAlertToast('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
        return false;
      }
    }
    : undefined;

  return (
    <div className="h-full flex flex-col">
      <Header
        onHomeClick={() => (user ? onNavigate('dashboard') : onNavigate('landing'))}
        onLoginClick={() => onNavigate('login')}
        onSignupClick={() => onNavigate('signup')}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onTabNavigate={onTabNavigate}
        onProfileClick={onProfileClick}
        user={user}
        currentView={currentView}
        showLogo={true}
      />
      <PublicMobileNav
        currentView={currentView}
        onNavigate={onNavigate}
        onAnalyzeClick={() => {
          const isRealMobileDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
          if (isRealMobileDevice) {
            return; // 내부 컴포넌트에서 안내 토스트 처리
          }
          onNavigate('analyze');
        }}
      />
      <main className="flex-1 overflow-x-hidden">
        <ErrorBoundary>
          <Suspense fallback={suspenseFallback}>
            {currentView === 'landing' && (
              <LandingPage
                onGetStarted={() => onNavigate('login')}
                onAnalyze={() => {
                  if (window.matchMedia('(max-width: 1023px)').matches) {
                    showAlertToast('무료분석은 PC에서 이용 가능합니다. PC로 접속해 주세요.', 'info');
                    return;
                  }
                  onNavigate('analyze');
                }}
                onGoToValue={() => onNavigate('value')}
                onGoToPricing={() => onNavigate('pricing')}
                onGoToNotices={() => onNavigate('notices')}
                onGoToContact={() => onNavigate('contact')}
              />
            )}
            {currentView === 'login' && (
              <AuthForm
                key="login"
                type="login"
                onSuccess={onLoginSuccess}
                onSwitch={() => onNavigate('signup')}
                onMfaRequired={(email) => {
                  onSetMfaPendingEmail(email);
                  onNavigate('mfa_otp');
                }}
              />
            )}
            {currentView === 'mfa_otp' && mfaPendingEmail && (
              <MfaOtpScreen
                email={mfaPendingEmail}
                onVerified={() => window.location.reload()}
                onCancel={() => {
                  onSetMfaPendingEmail(undefined);
                  onNavigate('login');
                }}
              />
            )}
            {currentView === 'signup' && (
              <AuthForm
                key="signup"
                type="signup"
                onSuccess={onLoginSuccess}
                onSwitch={() => onNavigate('login')}
                onContact={() => onNavigate('contact')}
                initialPlan={preSelectedPlan}
              />
            )}
            {currentView === 'invite' && inviteInfo && (
              <AuthForm
                type="invite"
                inviteInfo={inviteInfo}
                onSuccess={onLoginSuccess}
                onSwitch={() => onNavigate('login')}
              />
            )}
            {currentView === 'admin_panel' && isSystemAdmin && <AdminPanel />}
            {currentView === 'pricing' && (
              <PricingPage
                onContact={() => onNavigate('contact')}
                onGoToValue={() => onNavigate('value')}
                onGetStarted={onGetStartedWithPlan}
                currentPlan={planState?.plan}
                isLoggedIn={isLoggedIn}
                userName={user?.name}
                userPhone={user?.phone || ''}
                daysUntilExpiry={planState?.daysUntilExpiry}
                onSelectPlan={handlePlanSelect}
                onRequestPayment={handleRequestPayment}
              />
            )}
            {currentView === 'contact' && (
              <ContactPage
                onGetStarted={() => onNavigate('signup')}
                onAnalyze={() => onNavigate('analyze')}
              />
            )}
            {currentView === 'value' && (
              <ValuePage
                onGetStarted={() => onNavigate('signup')}
                onContact={() => onNavigate('contact')}
              />
            )}
            {currentView === 'analyze' && (
              <AnalyzePage
                onSignup={() => onNavigate('signup')}
                onContact={() => onNavigate('contact')}
              />
            )}
            {currentView === 'notices' && (
              <div className="max-w-3xl mx-auto py-12 px-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">업데이트 소식</h1>
                <p className="text-slate-500 mb-8">DenJOY 서비스의 새로운 기능과 개선 사항을 확인하세요.</p>
                <NoticeBoard isAdmin={isSystemAdmin} fullPage />
              </div>
            )}
            {currentView === 'reviews' && (
              <ReviewsPage onBack={() => onNavigate('landing')} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default PublicAppShell;
