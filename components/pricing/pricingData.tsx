import React from 'react';
import { TRIAL_OFFER_LABEL } from '../../utils/trialPolicy';
import { PLAN_LIMITS, PLAN_PRICING } from '../../types/plan';


export interface Plan {
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  highlight: boolean;
  cta: string;
  features: string[];
  limit: number;
  tag?: string;
}

export const plans: Plan[] = [
  {
    name: 'Free',
    description: '소규모 치과를 위한 기본 플랜',
    monthlyPrice: PLAN_PRICING['free'].monthlyPrice,
    yearlyPrice: PLAN_PRICING['free'].yearlyPrice,
    highlight: false,
    cta: '무료로 시작하기',
    limit: PLAN_LIMITS['free'].maxItems,
    features: [
      `재고 품목 최대 ${PLAN_LIMITS['free'].maxItems}개`,
      `수술기록 ${PLAN_LIMITS['free'].viewMonths}개월 조회`,
      '수술기록 월 1회 업로드',
      '수술 통계 기본 카드',
      '엑셀 업로드/다운로드',
      '1명 사용자',
    ],
  },
  {
    name: 'Basic',
    description: '혼자 쓰는 병원의 필수 도구',
    monthlyPrice: PLAN_PRICING['basic'].monthlyPrice,
    yearlyPrice: PLAN_PRICING['basic'].yearlyPrice,
    highlight: false,
    cta: TRIAL_OFFER_LABEL,
    limit: PLAN_LIMITS['basic'].maxItems,
    tag: '개인용',
    features: [
      `재고 품목 최대 ${PLAN_LIMITS['basic'].maxItems}개`,
      `수술기록 ${PLAN_LIMITS['basic'].viewMonths}개월 조회 · 주 1회 업로드`,
      '재고 마스터 대시보드',
      'FAIL(교환) 관리',
      '발주 생성 및 수령 처리',
      '재고실사',
      '수술차트 기본 (월별추세·요일별 패턴)',
    ],
  },
  {
    name: 'Plus',
    description: '팀이 쓰는 병원의 운영 인텔리전스',
    monthlyPrice: PLAN_PRICING['plus'].monthlyPrice,
    yearlyPrice: PLAN_PRICING['plus'].yearlyPrice,
    highlight: true,
    cta: TRIAL_OFFER_LABEL,
    limit: PLAN_LIMITS['plus'].maxItems,
    tag: '치과의원',
    features: [
      `재고 품목 최대 ${PLAN_LIMITS['plus'].maxItems}개`,
      `원장 포함 최대 ${PLAN_LIMITS['plus'].maxUsers}명 사용자`,
      '24개월 조회 · 무제한 업로드',
      '고급 대시보드 · 제조사 분석',
      '교환 분석 · 수술기록 고급 분석',
      '자동 재고 알림 · 발주 최적화',
      '간편발주 (카톡) · 역할별 권한',
      '이메일 지원 · 인테그레이션',
    ],
  },
  {
    name: 'Business',
    description: '대형 치과 및 네트워크를 위한 플랜',
    monthlyPrice: PLAN_PRICING['business'].monthlyPrice,
    yearlyPrice: PLAN_PRICING['business'].yearlyPrice,
    highlight: false,
    cta: TRIAL_OFFER_LABEL,
    limit: Infinity,
    tag: '치과의원, 치과병원',
    features: [
      '재고 품목 무제한',
      '기본 10명 · 추가 인원 5,000원/인',
      '원클릭 발주 시스템',
      'AI 기반 수요 예측',
      '월간·연간 리포트',
      '거래처 관리 · 감사 로그',
      '우선 지원 (채팅 + 전화)',
    ],
  },
];

export const comparisonCategories = [
  {
    name: '기본 기능',
    features: [
      { label: '재고 품목 수', values: (['free', 'basic', 'plus', 'business'] as const).map(p => PLAN_LIMITS[p].maxItems === Infinity ? '무제한' : `${PLAN_LIMITS[p].maxItems}개`) },
      { label: '수술기록 조회 기간', desc: '업로드된 수술기록 데이터를 조회할 수 있는 기간', values: (['free', 'basic', 'plus', 'business'] as const).map(p => `${PLAN_LIMITS[p].viewMonths}개월`) },
      { label: '수술기록 업로드 빈도', desc: '수술기록 엑셀 업로드 가능 횟수', values: ['월 1회', '주 1회', '무제한', '무제한'] },
      { label: '엑셀 업로드/다운로드', values: [true, true, true, true] },
      { label: '재고 마스터 대시보드', values: [false, true, true, true] },
      { label: '고급 대시보드', desc: '월별 추세, 요일별 패턴, 토스 분석 등 심층 인사이트', values: [false, false, true, true] },
    ],
  },
  {
    name: '수술기록 분석',
    features: [
      { label: '기본 수술 통계', desc: '수술 건수 카드, 규격별 사용통계', values: [true, true, true, true] },
      { label: '수술차트 기본', desc: '월별 추세 · 요일별 식립 패턴', values: [false, true, true, true] },
      { label: '수술차트 고급', desc: '규격별·브랜드별 상세 분석, 제조사별 교환율', values: [false, false, true, true] },
    ],
  },
  {
    name: '재고 관리',
    features: [
      { label: 'FAIL(교환) 관리', desc: '교환 발생 이력, 원인 분석, 자동 발주 연동', values: [false, true, true, true] },
      { label: '교환 분석', desc: '전체 교환현황, 제조사 분석, 월별 추세, 다빈도 규격', values: [false, false, true, true] },
      { label: '발주 생성 및 수령 처리', values: [false, true, true, true] },
      { label: '재고실사', values: [false, true, true, true] },
      { label: '재고실사 이력 분석', values: [false, false, true, true] },
      { label: '발주 최적화 추천', values: [false, false, true, true] },
      { label: '자동 재고 알림', values: [false, false, true, true] },
      { label: '간편발주 (카카오톡)', desc: '부족 품목을 카톡 메시지로 즉시 발주', values: [false, false, true, true] },
      { label: '제조사 소모량 분석', values: [false, false, true, true] },
      { label: '거래처 관리', desc: '자동 발주를 위한 거래처 정보 및 연락처 관리', values: [false, false, false, true] },
      { label: '원클릭 발주 시스템', values: [false, false, false, true] },
      { label: 'AI 수요 예측', values: [false, false, false, true] },
    ],
  },
  {
    name: '리포트',
    features: [
      { label: '월간 리포트', values: [false, false, false, true] },
      { label: '연간 리포트', values: [false, false, false, true] },
    ],
  },
  {
    name: '협업',
    features: [
      { label: '사용자 수', values: ['1명', '1명', `${PLAN_LIMITS['plus'].maxUsers}명`, `기본 ${PLAN_LIMITS['business'].maxUsers}명`] },
      { label: '추가 사용자', desc: '기본 인원 초과 시 1인당 5,000원/월 (부가세 별도)', values: [false, false, false, true] },
      { label: '역할별 권한 관리', desc: '원장/매니저/스탭 등 역할에 따라 메뉴 접근 및 데이터 수정 권한을 구분', values: [false, false, true, true] },
      { label: '인테그레이션', desc: 'Notion, Slack, 솔라피 등 외부 서비스 연동', values: [false, false, true, true] },
    ],
  },
  {
    name: '보안',
    features: [
      { label: '데이터 암호화', values: [true, true, true, true] },
      { label: '감사 로그', values: [false, false, false, true] },
    ],
  },
  {
    name: '지원',
    features: [
      { label: '커뮤니티 지원', values: [true, true, true, true] },
      { label: '이메일 지원', values: [false, false, true, true] },
      { label: '우선 지원 (채팅 + 전화)', values: [false, false, false, true] },
    ],
  },
];

export const faqs = [
  {
    q: '무료 플랜에서 유료 플랜으로 업그레이드하면 데이터가 유지되나요?',
    a: '네, 기존 데이터는 모두 그대로 유지됩니다. 업그레이드 즉시 추가 기능을 사용하실 수 있습니다.',
  },
  {
    q: `${TRIAL_OFFER_LABEL} 기간 중 결제가 되나요?`,
    a: '아닙니다. 체험 기간 동안은 결제가 발생하지 않으며, 체험 종료 후 유료 전환 의사를 확인한 뒤에만 결제가 진행됩니다. 카드 정보 없이도 체험 가능합니다.',
  },
  {
    q: '연간 결제 시 할인 혜택이 있나요?',
    a: `네, 연간 결제 시 월 결제 대비 약 20% 할인된 가격으로 이용 가능합니다. Plus 플랜 기준 월 ${PLAN_PRICING['plus'].monthlyPrice.toLocaleString('ko-KR')}원에서 ${PLAN_PRICING['plus'].yearlyPrice.toLocaleString('ko-KR')}원으로 할인됩니다.`,
  },
  {
    q: '개인용과 의원/병원용의 차이는 무엇인가요?',
    a: '개인용(Basic)은 1인 원장님이나 전담 실장님 등 개인 사용자를 위한 플랜으로, 재고·발주·교환 관리와 수술기록 기본 차트를 제공합니다. 의원/병원용(Plus/Business)은 다수의 구성원이 함께 쓰는 플랜으로 고급 대시보드, 교환 분석, 자동 재고 알림, 역할별 권한 관리 등 확장된 협업 기능이 포함됩니다.',
  },
  {
    q: '어떤 청구 프로그램을 지원하나요?',
    a: '현재는 덴트웹(DentWeb)에서 내보낸 엑셀 파일만 지원합니다. 원클릭 등 다른 청구 프로그램은 추후 업데이트를 통해 지원할 예정입니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '사용 일수에 비례하여 환불 처리됩니다. 연간 결제도 잔여 일수 기준으로 환불 가능하며, 환불 이후에는 Free 플랜 정책(한도 초과 데이터 읽기 전용)에 따라 서비스가 전환됩니다.',
  },
  {
    q: '결제 기간이 만료되어 갱신하지 못하면 어떻게 되나요?',
    a: '결제 만료 시 즉시 Free 플랜으로 전환됩니다. 기존 데이터는 모두 보존되지만, Free 한도(50개)를 초과하는 재고 데이터는 읽기 전용이 됩니다. 언제든 재결제하시면 모든 기능이 즉시 복원됩니다.',
  },
  {
    q: '데이터 보안과 개인정보는 어떻게 관리되나요?',
    a: '모든 데이터는 AES-256 암호화되어 안전하게 저장되며, 개인정보보호법에 따라 처리됩니다. 수술 기록에 포함된 환자 정보는 암호화된 상태로 보관되며, 2년 경과 후 자동 파기됩니다.',
  },
  {
    q: '어떤 결제 수단을 지원하나요?',
    a: '신용카드, 체크카드, 계좌이체를 지원합니다. 월간·연간 결제 모두 세금계산서 발행이 가능합니다.',
  },
  {
    q: '사용자 추가나 변경은 어떻게 하나요?',
    a: `Plus 플랜은 최대 ${PLAN_LIMITS['plus'].maxUsers}명, Business 플랜은 무제한으로 사용자를 추가할 수 있습니다. 관리자 계정에서 사용자 초대 및 권한 설정이 가능하며, 언제든 변경하실 수 있습니다.`,
  },
];

export const FINDER_QUESTIONS = [
  {
    q: '주간 임플란트 수술 건수는?',
    options: [
      { label: '주 5건 미만', value: 'under5', sub: '소규모 치과' },
      { label: '주 5~15건', value: '5to15', sub: '일반 규모' },
      { label: '주 15~30건', value: '15to30', sub: '활발한 치과' },
      { label: '주 30건 이상', value: 'over30', sub: '대형 치과' },
    ],
  },
  {
    q: '함께 사용하는 팀 규모는?',
    options: [
      { label: '나 혼자', value: '1', sub: '개인 사용' },
      { label: '2~3명', value: '2to3', sub: '소규모 팀' },
      { label: '4~5명', value: '4to5', sub: '중규모 팀' },
      { label: '6명 이상', value: '6plus', sub: '대규모 팀' },
    ],
  },
  {
    q: '가장 필요한 기능은?',
    options: [
      { label: '기본 재고 관리', value: 'basic', sub: '품목 등록·조회' },
      { label: '브랜드별 분석', value: 'analysis', sub: '소모 패턴 파악' },
      { label: '자동 재고 알림', value: 'alert', sub: '부족 알림·월간 리포트' },
      { label: 'AI 발주 자동화', value: 'ai', sub: '원클릭 발주·AI 예측' },
    ],
  },
];

export const PLAN_RESULT_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  Free: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', text: 'text-slate-700' },
  Basic: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
  Plus: { bg: 'bg-indigo-50', border: 'border-indigo-300', badge: 'bg-indigo-600 text-white', text: 'text-indigo-700' },
  Business: { bg: 'bg-purple-50', border: 'border-purple-300', badge: 'bg-purple-600 text-white', text: 'text-purple-700' },
};

export const formatPrice = (price: number) => {
  return price.toLocaleString('ko-KR');
};

export const CheckIcon = () => (
  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export const XIcon = () => (
  <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
