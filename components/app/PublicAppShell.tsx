import React, { Suspense, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../Header';
import { PublicMobileNav } from '../PublicMobileNav';
import ErrorBoundary from '../ErrorBoundary';
import PublicInfoFooter from '../shared/PublicInfoFooter';
import ConfirmModal from '../ConfirmModal';
import DowngradeMemberSelectModal from '../settings/DowngradeMemberSelectModal';
import { hospitalService } from '../../services/hospitalService';
import {
  BillingCycle,
  DashboardTab,
  HospitalPlanState,
  PlanFeature,
  PlanType,
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_ORDER,
  User,
  View,
} from '../../types';
import { ToastType } from '../../hooks/useToast';
import { tossPaymentService } from '../../services/tossPaymentService';
import { planService } from '../../services/planService';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const FEATURE_LABELS: Partial<Record<PlanFeature, string>> = {
  dashboard_advanced: '고급 대시보드',
  brand_analytics: '브랜드 분석',
  fail_management: 'FAIL 관리',
  order_execution: '발주 실행',
  inventory_audit: '재고 실사',
  audit_history: '재고실사 이력 및 분석',
  return_management: '반납 관리',
  auto_stock_alert: '자동 재고 알림',
  monthly_report: '월간 리포트',
  role_management: '역할 관리',
  integrations: '외부 연동 (Notion · Slack)',
};

function getDowngradeLines(fromPlan: PlanType, toPlan: PlanType): { message: string; tip?: string } {
  const fromLimits = PLAN_LIMITS[fromPlan];
  const toLimits = PLAN_LIMITS[toPlan];
  const toFeatureSet = new Set(toLimits.features);

  const removedLabels = fromLimits.features
    .filter(f => !toFeatureSet.has(f))
    .map(f => FEATURE_LABELS[f])
    .filter(Boolean) as string[];

  const lines: string[] = [];
  if (removedLabels.length > 0) {
    lines.push('다음 기능이 더 이상 사용되지 않습니다:');
    removedLabels.forEach(l => lines.push(`  • ${l}`));
  }

  const tips: string[] = [];
  if (toLimits.maxItems !== Infinity && fromLimits.maxItems > toLimits.maxItems) {
    tips.push(`재고 아이템 한도: ${fromLimits.maxItems}개 → ${toLimits.maxItems}개`);
  }
  if (toLimits.maxUsers !== Infinity && fromLimits.maxUsers > toLimits.maxUsers) {
    tips.push(`멤버 수: ${fromLimits.maxUsers}명 → ${toLimits.maxUsers}명 (초과 멤버는 읽기 전용 전환)`);
  }
  if (fromLimits.retentionMonths > toLimits.retentionMonths) {
    tips.push(`기록 보관 기간: ${fromLimits.retentionMonths}개월 → ${toLimits.retentionMonths}개월`);
  }

  return {
    message: lines.join('\n') || `${PLAN_NAMES[fromPlan]} 플랜의 일부 기능이 ${PLAN_NAMES[toPlan]} 플랜에서는 사용 불가합니다.`,
    tip: tips.length > 0 ? tips.join('\n') : undefined,
  };
}

const LandingPage = lazyWithRetry(() => import('../LandingPage'));
const AuthForm = lazyWithRetry(() => import('../AuthForm'));
const PricingPage = lazyWithRetry(() => import('../PricingPage'));
const ContactPage = lazyWithRetry(() => import('../ContactPage'));
const ValuePage = lazyWithRetry(() => import('../ValuePage'));
const AnalyzePage = lazyWithRetry(() => import('../AnalyzePage'));
const NoticeBoard = lazyWithRetry(() => import('../NoticeBoard'));
const AdminPanel = lazyWithRetry(() => import('../AdminPanel'));
const MfaOtpScreen = lazyWithRetry(() => import('../MfaOtpScreen'));
const ReviewsPage = lazyWithRetry(() => import('../ReviewsPage'));
const ConsultationPage = lazyWithRetry(() => import('../ConsultationPage'));

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
  const [consultationPrefill, setConsultationPrefill] = useState<{ email: string; hospitalName?: string; region?: string; contact?: string }>({ email: '' });
  const [downgradePending, setDowngradePending] = useState<{ plan: PlanType; billing: BillingCycle } | null>(null);
  const [downgradeCreditPreview, setDowngradeCreditPreview] = useState<number>(0);
  const [downgradeCreditDetail, setDowngradeCreditDetail] = useState<Awaited<ReturnType<typeof planService.estimateDowngradeCreditDetail>>>(null);
  const [memberSelectPending, setMemberSelectPending] = useState<{ plan: PlanType; billing: BillingCycle } | null>(null);
  const hasPublicMobileNav = publicViews.includes(currentView);

  const executePlanChange = async (plan: PlanType, billing: BillingCycle, memberIdsToSuspend?: string[]) => {
    try {
      const ok = await planService.changePlan(user!.hospitalId!, plan, billing, memberIdsToSuspend);
      if (ok) {
        const ps = await planService.getHospitalPlan(user!.hospitalId!);
        onPlanStateActivated(ps);
        const suspendCount = memberIdsToSuspend?.length ?? 0;
        const memberNote = suspendCount > 0
          ? ` ${suspendCount}명의 멤버 접근이 제한되었습니다.`
          : '';
        showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${memberNote}`, 'success');
      } else {
        showAlertToast('플랜 변경 권한이 없습니다. 병원 관리자만 플랜을 변경할 수 있습니다.', 'error');
      }
    } catch (err) {
      console.error('[PublicAppShell] Plan change error:', err);
      showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const handlePlanSelect = user?.hospitalId
    ? async (plan: PlanType, billing: BillingCycle) => {
      const currentPlan = planState?.plan ?? 'free';

      // 동일 플랜 갱신: 결제 필요 (DB 직접 업데이트 아님)
      if (plan === currentPlan && currentPlan !== 'free') {
        const result = await tossPaymentService.requestPayment({
          hospitalId: user.hospitalId!,
          plan,
          billingCycle: billing,
          customerName: user.name || '',
          paymentMethod: 'card',
          // H-2: 보유 크레딧 자동 적용 (0이면 무시됨)
          creditUsedAmount: planState?.creditBalance ?? 0,
        });
        if (result.error && result.error !== 'user_cancel') {
          showAlertToast(result.error, 'error');
        }
        return;
      }

      const isDowngrade = PLAN_ORDER[plan] < PLAN_ORDER[currentPlan];
      if (isDowngrade) {
        // M-3: 다운그레이드 전 크레딧 예상 금액 + 상세 내역 미리 계산
        let creditPreview = 0;
        let creditDetail = null;
        if (user?.hospitalId) {
          creditDetail = await planService.estimateDowngradeCreditDetail(user.hospitalId, currentPlan, plan);
          creditPreview = creditDetail?.creditAmount ?? 0;
        }
        setDowngradeCreditPreview(creditPreview);
        setDowngradeCreditDetail(creditDetail);
        setDowngradePending({ plan, billing });
        return;
      }
      await executePlanChange(plan, billing);
    }
    : undefined;

  const handleRequestPayment = user?.hospitalId
    ? async (
      plan: PlanType,
      billing: BillingCycle,
      contactName: string,
      _contactPhone: string,
      paymentMethod: 'card' | 'transfer',
      _receiptType?: 'cash_receipt' | 'tax_invoice'
    ) => {
      // TossPayments SDK 결제 시작:
      // 성공 시 → /payment/success 로 full redirect (이 함수는 반환되지 않음)
      // 취소/오류 시 → error 반환
      const result = await tossPaymentService.requestPayment({
        hospitalId: user.hospitalId!,
        plan,
        billingCycle: billing,
        customerName: contactName.trim(),
        paymentMethod,
      });

      if (result.error && result.error !== 'user_cancel') {
        throw new Error(result.error);
      }
      // 취소는 조용히 처리
      return false; // 성공 시 여기까지 도달 안 함
    }
    : undefined;

  const handleNavigate = (targetView: View) => {
    onNavigate(targetView);
  };

  const handleAnalyzeEntry = () => {
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
      description: 'Free부터 Business까지, 병원 규모에 맞는 요금제. 무료 플랜으로 바로 시작하세요.',
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

  const downgradeDiff = downgradePending
    ? getDowngradeLines(planState?.plan ?? 'free', downgradePending.plan)
    : null;

  const downgradeCreditMsg = (() => {
    if (!downgradeCreditDetail || downgradeCreditDetail.creditAmount <= 0) return undefined;
    const d = downgradeCreditDetail;
    const fmt = (n: number) => n.toLocaleString('ko-KR');
    const cycleLabel = d.billingCycle === 'yearly' ? '연간' : '월간';
    const lines: string[] = [`크레딧 계산 내역 (${cycleLabel} · ${d.totalDays}일 기준)`];
    if (d.actualPaidAmount !== null) {
      lines.push(`· 결제 금액: ${fmt(d.actualPaidAmount)}원`);
    }
    lines.push(`· 이용 기간: ${d.usedDays}일 / ${d.totalDays}일 → 잔여 ${d.remainingDays}일`);
    lines.push(`· 현재 플랜 잔여: ${fmt(d.upperRemaining)}원 (${fmt(d.upperDailyRate)}원/일 × ${d.remainingDays}일)`);
    if (d.lowerDailyRate > 0) {
      lines.push(`· ${PLAN_NAMES[downgradePending?.plan ?? 'free']} 사용료 차감: -${fmt(d.lowerCost)}원 (${fmt(d.lowerDailyRate)}원/일 × ${d.remainingDays}일)`);
    }
    lines.push(`· 적립 크레딧: ${fmt(d.creditAmount)}원`);
    return lines.join('\n');
  })();

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
          onConfirm={async () => {
            const { plan, billing } = downgradePending;
            setDowngradePending(null);
            // 멤버 수 제한이 있는 플랜이면 현재 멤버 수 확인
            const newMaxUsers = PLAN_LIMITS[plan].maxUsers;
            if (newMaxUsers !== Infinity && user?.hospitalId) {
              const count = await hospitalService.getActiveMemberCount(user.hospitalId);
              if (count > newMaxUsers) {
                setMemberSelectPending({ plan, billing });
                return;
              }
            }
            // 다운그레이드: 즉시 전환 + 잔여금 크레딧 적립
            try {
              const result = await planService.executeDowngrade(user!.hospitalId!, plan, billing);
              const ps = await planService.getHospitalPlan(user!.hospitalId!);
              onPlanStateActivated(ps);
              const creditMsg = result.creditAdded > 0
                ? ` ${result.creditAdded.toLocaleString('ko-KR')}원이 크레딧으로 적립되었습니다.`
                : '';
              showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${creditMsg}`, 'success');
            } catch {
              showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            }
          }}
          onCancel={() => setDowngradePending(null)}
        />
      )}
      {memberSelectPending && user?.hospitalId && (
        <DowngradeMemberSelectModal
          hospitalId={user.hospitalId}
          newPlan={memberSelectPending.plan}
          onConfirm={async (memberIdsToSuspend) => {
            const { plan, billing } = memberSelectPending;
            setMemberSelectPending(null);
            // C-4 수정: executeDowngrade로 크레딧 적립 후 선택된 멤버 접근 제한
            try {
              const result = await planService.executeDowngrade(user!.hospitalId!, plan, billing);
              await planService.suspendMembersForDowngrade(user!.hospitalId!, memberIdsToSuspend);
              const ps = await planService.getHospitalPlan(user!.hospitalId!);
              onPlanStateActivated(ps);
              const creditMsg = result.creditAdded > 0
                ? ` ${result.creditAdded.toLocaleString('ko-KR')}원이 크레딧으로 적립되었습니다.`
                : '';
              const memberNote = memberIdsToSuspend.length > 0
                ? ` ${memberIdsToSuspend.length}명의 멤버 접근이 제한되었습니다.`
                : '';
              showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${creditMsg}${memberNote}`, 'success');
            } catch {
              showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            }
          }}
          onCancel={() => setMemberSelectPending(null)}
        />
      )}
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
      </Helmet>
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
      <main className={`flex-1 overflow-x-hidden ${hasPublicMobileNav ? 'pb-36 xl:pb-0' : ''}`}>
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
                onContact={(data) => { setConsultationPrefill(data); handleNavigate('consultation'); }}
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
              <ConsultationPage
                onBack={() => handleNavigate('analyze')}
                initialEmail={consultationPrefill.email}
                initialHospitalName={consultationPrefill.hospitalName}
                initialRegion={consultationPrefill.region}
                initialContact={consultationPrefill.contact}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default PublicAppShell;
