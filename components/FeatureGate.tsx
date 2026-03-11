import React, { useState } from 'react';
import { PlanType, BillingCycle, PlanFeature, PLAN_NAMES } from '../types';
import { planService } from '../services/planService';
import UpgradeModal from './UpgradeModal';
import FailManagementDemo from './fail/FailManagementDemo';

/** 기능별 잠금 화면 메시지 */
const FEATURE_LOCK_CONFIG: Partial<Record<PlanFeature, { title: string; desc: string }>> = {
  fail_management: {
    title: '교환(FAIL) 관리',
    desc: '수술 중 교환 이력부터 반품까지 체계적으로 관리하세요.',
  },
  order_execution: {
    title: '발주 관리',
    desc: '재고 부족 품목을 자동 감지하고 클릭 한 번으로 발주·수령을 처리하세요.',
  },
  inventory_audit: {
    title: '재고 실사',
    desc: '실물 재고와 시스템 수량을 정확히 일치시켜 재고 오차를 영구히 제거하세요.',
  },
  return_management: {
    title: '반품 관리',
    desc: '반품 요청부터 픽업·완료까지 전 과정을 체계적으로 추적하세요.',
  },
  brand_analytics: {
    title: '제조사 분석',
    desc: '제조사·브랜드별 사용 현황과 교환율을 한눈에 파악하세요.',
  },
  dashboard_advanced: {
    title: '고급 대시보드',
    desc: '월별 추세, 요일별 패턴, 토스 분석 등 심층 인사이트를 확인하세요.',
  },
  monthly_report: {
    title: '월간 리포트',
    desc: '매월 사용 현황을 자동으로 집계해 PDF 리포트로 받아보세요.',
  },
  role_management: {
    title: '권한 관리',
    desc: '직원별 접근 권한을 세분화하여 데이터를 안전하게 보호하세요.',
  },
  surgery_chart_basic: {
    title: '수술기록 차트',
    desc: '월별 수술 추세와 요일별 식립 패턴을 차트로 확인하세요.',
  },
  surgery_chart_advanced: {
    title: '수술기록 고급 분석',
    desc: '규격별·브랜드별 상세 분석으로 수술 패턴을 깊이 있게 파악하세요.',
  },
  exchange_analysis: {
    title: '교환 분석',
    desc: '전체 교환 현황, 제조사 분석, 월별 추세, 다빈도 규격을 확인하세요.',
  },
  order_optimization: {
    title: '발주 최적화',
    desc: 'AI가 재고 소진 속도를 분석해 최적 발주 시점과 수량을 추천합니다.',
  },
  simple_order: {
    title: '간편발주',
    desc: '부족 품목을 카카오톡 메시지로 즉시 발주할 수 있습니다.',
  },
};

/** 데모 지원 기능 목록 */
const DEMO_SUPPORTED: Partial<Record<PlanFeature, boolean>> = {
  fail_management: true,
};

const DEMO_SEEN_KEY = (feature: PlanFeature) => `fd_demo_seen_${feature}`;

interface FeatureGateProps {
  feature: PlanFeature;
  plan: PlanType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** 축적된 데이터 힌트 — Endowment Effect 강화용 (예: "FAIL 기록 47건 대기 중") */
  dataHint?: string;
  /** 결제 모달 직접 열기 콜백 */
  onOpenPaymentModal?: (plan: PlanType, billing?: BillingCycle) => void;
  /** 마이페이지 구독 관리 탭 열기 콜백 */
  onOpenProfilePlan?: () => void;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ feature, plan, children, fallback, dataHint, onOpenPaymentModal, onOpenProfilePlan }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  if (planService.canAccess(plan, feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredPlan = planService.getRequiredPlan(feature);
  const lockConfig = FEATURE_LOCK_CONFIG[feature];
  const canDemo = DEMO_SUPPORTED[feature] && !localStorage.getItem(DEMO_SEEN_KEY(feature));

  const handleShowDemo = () => {
    localStorage.setItem(DEMO_SEEN_KEY(feature), '1');
    setShowDemo(true);
  };

  if (showDemo && feature === 'fail_management') {
    return (
      <div className="relative min-h-[320px] bg-white rounded-2xl overflow-hidden border border-slate-100">
        <FailManagementDemo
          onUpgrade={() => setShowModal(true)}
          onClose={() => setShowDemo(false)}
        />
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentPlan={plan}
          requiredPlan={requiredPlan}
          feature={feature}
          triggerMessage={lockConfig?.desc ?? `이 기능은 ${PLAN_NAMES[requiredPlan]} 이상에서 사용 가능합니다`}
          onSelectPlan={(selectedPlan, selectedBilling) => { setShowModal(false); onOpenPaymentModal?.(selectedPlan, selectedBilling); }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-[320px]">
        <div className="pointer-events-none opacity-20 blur-[3px] select-none max-h-80 overflow-hidden">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/70 to-white/95 backdrop-blur-sm rounded-2xl">
          <div className="text-center space-y-4 p-8 max-w-sm">
            {/* 자물쇠 아이콘 */}
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>

            {/* 제목 + 설명 */}
            {lockConfig ? (
              <div>
                <p className="text-base font-bold text-slate-800">{lockConfig.title}</p>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed [word-break:keep-all]">{lockConfig.desc}</p>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-700">
                이 기능은 {PLAN_NAMES[requiredPlan]} 이상에서 사용할 수 있습니다
              </p>
            )}

            {/* Endowment Effect 힌트 */}
            {dataHint && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <p className="text-xs font-bold text-amber-700">{dataHint}</p>
              </div>
            )}

            {/* 플랜 배지 + CTA */}
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                <span className="font-bold text-indigo-600">{PLAN_NAMES[requiredPlan]}</span> 플랜부터 사용 가능
              </p>
              <button
                onClick={onOpenProfilePlan ?? (() => setShowModal(true))}
                className="w-full px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                업그레이드하기
              </button>
              {canDemo && (
                <button
                  onClick={handleShowDemo}
                  className="w-full px-5 py-2 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  데모 미리보기 <span className="text-indigo-400 font-normal">(1회)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentPlan={plan}
        requiredPlan={requiredPlan}
        feature={feature}
        triggerMessage={lockConfig?.desc ?? `이 기능은 ${PLAN_NAMES[requiredPlan]} 이상에서 사용 가능합니다`}
        onSelectPlan={(selectedPlan, selectedBilling) => { setShowModal(false); onOpenPaymentModal?.(selectedPlan, selectedBilling); }}
      />
    </>
  );
};

export default FeatureGate;
