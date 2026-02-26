import React, { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../Header';
import { PublicMobileNav } from '../PublicMobileNav';
import ErrorBoundary from '../ErrorBoundary';
import PublicInfoFooter from '../shared/PublicInfoFooter';
import KakaoChannelButton from '../KakaoChannelButton';
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
const ConsultationPage = lazy(() => import('../ConsultationPage'));

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
  const publicViews: View[] = ['landing', 'value', 'pricing', 'contact', 'analyze', 'notices', 'reviews'];
  const hasPublicMobileNav = publicViews.includes(currentView);

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

  const handleNavigate = (targetView: View) => {
    if (targetView === 'analyze') {
      const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
      const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

      if (isMobileSize || isTouchDevice) {
        showAlertToast('무료분석은 PC에서 이용 가능합니다. PC로 접속해 주세요.', 'info');
        return;
      }
    }
    onNavigate(targetView);
  };

  const handleAnalyzeEntry = () => {
    const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isMobileSize || isTouchDevice) {
      showAlertToast('무료분석은 PC에서 이용 가능합니다. 문의 페이지로 안내합니다.', 'info');
      onNavigate('contact');
      return;
    }
    onNavigate('analyze');
  };

  const PAGE_META: Record<string, { title: string; description: string }> = {
    landing: {
      title: 'DenJOY - 치과 임플란트 재고관리 SaaS',
      description: '매주 2시간 엑셀 정리를 5분으로. 덴트웹 데이터 업로드만으로 실시간 재고 추적, 스마트 발주, 수술기록 자동 연동.',
    },
    value: {
      title: '도입효과 | DenJOY',
      description: '연 104시간 절약, 발주 실수 감소, 비용 누수 방지. DenJOY 도입 전후 변화를 확인하세요.',
    },
    pricing: {
      title: '요금제 | DenJOY',
      description: 'Free부터 Enterprise까지, 병원 규모에 맞는 요금제. 무료 플랜으로 바로 시작하세요.',
    },
    reviews: {
      title: '고객후기 | DenJOY',
      description: '치과 원장, 실장, 스탭이 직접 남긴 DenJOY 사용 후기를 확인하세요.',
    },
    notices: {
      title: '업데이트 소식 | DenJOY',
      description: 'DenJOY 서비스의 새로운 기능과 개선 사항을 확인하세요.',
    },
    contact: {
      title: '문의하기 | DenJOY',
      description: '도입 상담, 요금제 안내, 맞춤 기능 문의. DenJOY 팀에 편하게 연락하세요.',
    },
    analyze: {
      title: '무료 분석 | DenJOY',
      description: '덴트웹 수술기록을 업로드하면 재고 건강도를 무료로 분석해 드립니다.',
    },
    login: {
      title: '로그인 | DenJOY',
      description: 'DenJOY 계정에 로그인하세요.',
    },
    signup: {
      title: '회원가입 | DenJOY',
      description: '1분이면 끝나는 간단한 가입. 지금 무료로 시작하세요.',
    },
  };

  const meta = PAGE_META[currentView] || PAGE_META.landing;

  return (
    <div className="h-full flex flex-col">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
      </Helmet>
      <KakaoChannelButton />
      <Header
        onHomeClick={() => (user ? handleNavigate('dashboard') : handleNavigate('landing'))}
        onLoginClick={() => handleNavigate('login')}
        onSignupClick={() => handleNavigate('signup')}
        onLogout={onLogout}
        onNavigate={handleNavigate}
        onTabNavigate={onTabNavigate}
        onProfileClick={onProfileClick}
        user={user}
        currentView={currentView}
        showLogo={true}
      />
      <PublicMobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onAnalyzeClick={handleAnalyzeEntry}
      />
      <main className={`flex-1 overflow-x-hidden ${hasPublicMobileNav ? 'pb-24 xl:pb-0' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={suspenseFallback}>
            {currentView === 'landing' && (
              <LandingPage
                onGetStarted={() => handleNavigate('signup')}
                onAnalyze={() => handleNavigate('analyze')}
                onGoToValue={() => handleNavigate('value')}
                onGoToPricing={() => handleNavigate('pricing')}
                onGoToNotices={() => handleNavigate('notices')}
                onGoToContact={() => handleNavigate('contact')}
              />
            )}
            {currentView === 'login' && (
              <AuthForm
                key="login"
                type="login"
                onSuccess={onLoginSuccess}
                onSwitch={() => handleNavigate('signup')}
                onMfaRequired={(email) => {
                  onSetMfaPendingEmail(email);
                  handleNavigate('mfa_otp');
                }}
              />
            )}
            {currentView === 'mfa_otp' && mfaPendingEmail && (
              <MfaOtpScreen
                email={mfaPendingEmail}
                onVerified={() => window.location.reload()}
                onCancel={() => {
                  onSetMfaPendingEmail(undefined);
                  handleNavigate('login');
                }}
              />
            )}
            {currentView === 'signup' && (
              <AuthForm
                key="signup"
                type="signup"
                onSuccess={onLoginSuccess}
                onSwitch={() => handleNavigate('login')}
                onContact={() => handleNavigate('contact')}
                initialPlan={preSelectedPlan}
              />
            )}
            {currentView === 'invite' && inviteInfo && (
              <AuthForm
                type="invite"
                inviteInfo={inviteInfo}
                onSuccess={onLoginSuccess}
                onSwitch={() => handleNavigate('login')}
              />
            )}
            {currentView === 'admin_panel' && isSystemAdmin && <AdminPanel />}
            {currentView === 'pricing' && (
              <PricingPage
                onContact={() => handleNavigate('contact')}
                onGoToValue={() => handleNavigate('value')}
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
                onGetStarted={() => handleNavigate('signup')}
                onAnalyze={() => handleNavigate('analyze')}
              />
            )}
            {currentView === 'value' && (
              <ValuePage
                onGetStarted={() => handleNavigate('signup')}
                onContact={() => handleNavigate('contact')}
              />
            )}
            {currentView === 'analyze' && (
              <AnalyzePage
                onSignup={() => handleNavigate('signup')}
                onContact={() => handleNavigate('consultation')}
              />
            )}
            {currentView === 'notices' && (
              <>
                <div className="max-w-3xl mx-auto py-12 px-6">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">업데이트 소식</h1>
                  <p className="text-slate-500 mb-8">DenJOY 서비스의 새로운 기능과 개선 사항을 확인하세요.</p>
                  <NoticeBoard isAdmin={isSystemAdmin} fullPage />
                </div>
                <PublicInfoFooter showLegalLinks />
              </>
            )}
            {currentView === 'reviews' && (
              <ReviewsPage onBack={() => handleNavigate('landing')} />
            )}
            {currentView === 'consultation' && (
              <ConsultationPage onBack={() => handleNavigate('analyze')} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default PublicAppShell;
