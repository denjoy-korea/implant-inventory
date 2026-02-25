import React, { useEffect, useMemo, useRef } from 'react';
import {
  TRIAL_OFFER_LABEL,
  SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT,
  TRIAL_DATA_DELETION_POLICY_TEXT,
} from '../../utils/trialPolicy';
import { BUSINESS_INFO } from '../../utils/businessInfo';

interface LegalModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

// 강조 단락: 사용자가 반드시 인지해야 할 의무·권리 항목에만 사용
type ParagraphEntry = string | { text: string; highlight: true } | { type: 'table'; headers: string[]; rows: string[][] };

const EFFECTIVE_DATE = '2026년 2월 25일';

const TERMS_SECTIONS: Array<{ title: string; paragraphs: ParagraphEntry[] }> = [
  {
    title: '제1조 (목적)',
    paragraphs: [
      '본 약관은 디앤조이(이하 "회사")가 제공하는 DenJOY SaaS 서비스(이하 "서비스")의 이용 조건, 회원과 회사의 권리·의무 및 책임 사항을 정함을 목적으로 합니다.',
    ],
  },
  {
    title: '제2조 (용어의 정의 및 서비스 범위)',
    paragraphs: [
      '"서비스"란 회사가 제공하는 임플란트 재고 관리, 수술기록 연동, 통계 분석, 사용자 권한 관리, 결제 및 고객지원 기능을 포함하는 웹 기반 소프트웨어를 의미합니다.',
      '"회원"이란 본 약관에 동의하고 계정을 생성하여 서비스를 이용하는 치과 병·의원 또는 사업자를 의미합니다.',
      '서비스는 Free 플랜과 유료 플랜(월간/연간)으로 구분되며, 구체적인 기능 및 요금은 서비스 결제 페이지에 게시된 내용을 따릅니다.',
      '회사는 안정적인 제공을 위해 서비스 기능, 화면, 요금제를 변경할 수 있으며, 중요한 변경은 사전 공지합니다.',
    ],
  },
  {
    title: '제3조 (이용계약의 성립 및 계정 관리)',
    paragraphs: [
      '회원은 정확한 정보를 제공해야 하며, 계정 및 비밀번호의 관리 책임은 회원에게 있습니다.',
      {
        text: '의료 현장의 특성상 다수의 직원이 계정을 공유할 경우, 그로 인해 발생하는 모든 보안 사고 및 데이터 유출에 대한 관리 책임은 회원에게 있습니다.',
        highlight: true,
      },
      '회원은 계정을 제3자에게 양도하거나 공유할 수 없으며, 제3자의 무단 접근을 인지한 경우 즉시 회사에 통지하고 회사의 안내에 따라야 합니다.',
    ],
  },
  {
    title: '제4조 (의료 데이터 및 개인정보 보호)',
    paragraphs: [
      {
        text: '(회원의 의무) 회원은 환자의 수술기록 등 개인정보를 서비스에 입력할 경우, 관련 법령(의료법, 개인정보 보호법 등)에 따른 적법한 동의를 얻어야 하며, 이를 위반하여 발생하는 모든 법적 책임은 회원에게 있습니다.',
        highlight: true,
      },
      '(수탁자의 지위) 회사는 서비스 제공을 위해 회원이 입력한 데이터를 보관·처리하는 수탁자의 지위를 가지며, 회원의 별도 요청이나 법령상의 근거 없이 데이터를 열람하거나 제3자에게 제공하지 않습니다.',
    ],
  },
  {
    title: '제5조 (요금제, 자동갱신, 결제)',
    paragraphs: [
      {
        text: '유료 플랜은 월간 또는 연간 구독으로 제공되며, 별도 해지하지 않는 한 동일 조건으로 자동 갱신됩니다.',
        highlight: true,
      },
      '회원은 다음 결제 예정일 이전에 서비스 설정 화면 또는 고객지원 채널을 통해 해지할 수 있으며, 해지 시 다음 결제 주기부터 과금되지 않습니다.',
      '결제 수단, 청구 방식 및 세금(VAT) 정책은 결제 화면 또는 결제 안내에 따릅니다.',
      '요금제 변경이나 단가 조정이 필요한 경우, 회사는 최소 적용 30일 전에 회원에게 공지합니다.',
    ],
  },
  {
    title: '제6조 (무료 체험 및 데이터 정책)',
    paragraphs: [
      `${TRIAL_OFFER_LABEL} 기간에는 카드 등록 없이 서비스를 이용할 수 있습니다.`,
      {
        text: `${TRIAL_DATA_DELETION_POLICY_TEXT} 회사는 데이터 삭제 3일 전, 등록된 이메일을 통해 삭제 예정 사실을 사전 고지합니다.`,
        highlight: true,
      },
      SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT,
    ],
  },
  {
    title: '제7조 (해지, 청약철회, 환불)',
    paragraphs: [
      '회원은 서비스 설정 화면 또는 고객지원 채널을 통해 언제든지 해지를 요청할 수 있습니다.',
      {
        text: '(전액 환불) 결제 후 7일 이내에 서비스 이용 내역(데이터 입력, 조회 등)이 없는 경우 전액 환불이 가능합니다.',
        highlight: true,
      },
      '(중도 환불 산정) 서비스 이용이 개시된 이후의 환불 금액은 결제 금액에서 이용 완료 일수에 해당하는 금액을 공제하여 산정합니다. 일할 단가는 결제한 플랜의 정가를 해당 구독 기간의 총 일수로 나눈 금액을 기준으로 합니다.',
      '(연간 구독) 연간 구독 상품 중도 해지 시, 할인된 혜택은 취소되며 환불 신청일까지의 이용 기간에 대해 월간 구독 정가를 적용하여 차감 후 정산합니다.',
      '디지털 서비스의 특성상 사용이 개시되거나 제공이 완료된 구간은 관련 법령이 허용하는 범위에서 청약철회 또는 환불이 제한될 수 있습니다.',
      '환불 신청 접수 후 실제 처리는 카드사 및 결제망 상황에 따라 영업일 기준 5~7일이 소요될 수 있습니다.',
    ],
  },
  {
    title: '제8조 (서비스 변경, 중단, 종료)',
    paragraphs: [
      '회사는 점검, 장애 복구, 보안 대응, 외부 인프라 이슈, 불가항력 사유로 서비스 일부 또는 전부를 일시 중단할 수 있습니다. 정기 점검 등 예정된 중단의 경우 최소 3일 전에 공지합니다.',
      {
        text: '회사는 보안 취약점 대응, 장애 복구, 기능 개선을 위해 웹 애플리케이션 및 PWA 업데이트를 배포할 수 있으며, 중대한 보안 위험이 확인된 경우 이용자 보호를 위해 업데이트 적용이 즉시 진행될 수 있습니다.',
        highlight: true,
      },
      '서비스는 업데이트 감지 시 적용 안내를 제공하며, 회원은 안정적인 서비스 이용을 위해 최신 버전 사용을 유지해야 합니다.',
      '중대한 운영 변경 또는 서비스 종료가 필요한 경우 회사는 사전에 공지하고 이용자 보호 조치를 안내합니다.',
    ],
  },
  {
    title: '제9조 (회원의 의무 및 금지행위)',
    paragraphs: [
      '회원은 서비스 운영을 방해하거나 법령을 위반하는 행위를 해서는 안 됩니다.',
      {
        text: '회원은 회사의 사전 동의 없이 서비스 및 데이터, 소프트웨어를 복제·배포·역설계할 수 없습니다.',
        highlight: true,
      },
    ],
  },
  {
    title: '제10조 (책임 범위)',
    paragraphs: [
      '회사는 천재지변, 통신 장애, 제3자 인프라(클라우드 서버 등) 장애 등 불가항력 사유로 인한 손해에 대해 책임이 제한될 수 있습니다.',
      '회사는 회원의 귀책사유로 발생한 손해에 대해 책임을 지지 않습니다.',
      '회사는 회사의 고의 또는 중과실이 없는 한, 서비스 중단으로 인해 발생한 치과 영업 손실 등 간접적·특별 손해에 대해서는 배상 책임을 지지 않습니다.',
      '회사의 손해배상 책임은 관련 법령이 허용하는 범위에서 제한됩니다.',
    ],
  },
  {
    title: '제11조 (분쟁처리 및 관할)',
    paragraphs: [
      `회원 불만 및 분쟁은 ${BUSINESS_INFO.supportEmail}로 접수할 수 있으며, 회사는 접수된 사안에 대해 지체 없이 1차 회신을 진행합니다.`,
      '본 약관은 대한민국 법령을 준거법으로 하며, 서비스 이용 관련 분쟁은 민사소송법상 관할 법원에 제기합니다.',
    ],
  },
  {
    title: '제12조 (약관 변경 및 고지)',
    paragraphs: [
      '회사는 관련 법령을 준수하는 범위에서 약관을 개정할 수 있으며, 중요한 변경은 적용일 전 공지합니다.',
      '회원에게 불리한 변경은 적용일 30일 전에 공지합니다.',
      '회원이 변경 약관 적용일 이후 서비스를 계속 이용하는 경우 변경 약관에 동의한 것으로 봅니다.',
    ],
  },
];

const PRIVACY_SECTIONS: Array<{ title: string; paragraphs: ParagraphEntry[] }> = [
  {
    title: '개요',
    paragraphs: [
      '디앤조이(이하 "회사")는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.',
    ]
  },
  {
    title: '1. 개인정보의 처리 목적',
    paragraphs: [
      '회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.',
      '서비스 제공 및 계약 이행: 회원 식별, 서비스 제공, 임플란트 재고 관리 및 수술기록 연동 기능 제공, 결제 및 정산.',
      '회원 관리: 회원 가입 의사 확인, 본인 확인, 부정 이용 방지, 각종 고지·통지, 고충 처리.',
      '서비스 개선 및 마케팅: 신규 서비스 개발, 접속 빈도 파악, 서비스 이용 통계 분석(익명화된 정보에 한함).',
    ],
  },
  {
    title: '2. 개인정보의 처리 및 보유 기간',
    paragraphs: [
      '회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터 개인정보 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.',
      '회원 정보: 회원 탈퇴 시까지. 단, 다음의 사유에 해당하는 경우 해당 기간 종료 시까지 보관합니다.',
      {
        text: '관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우: 해당 수사·조사 종료 시까지.',
        highlight: true,
      },
      '전자상거래법에 따른 계약·청약철회, 대금결제, 재화 등의 공급 기록: 5년.',
      '전자금융거래법에 따른 전자금융 거래 기록: 5년.',
      '서비스 운영 로그(접속 로그, 업데이트 감지/적용 기록, 오류 대응 기록): 생성일로부터 최대 1년 보관 후 파기 또는 비식별 처리.',
      {
        text: '무료 체험 데이터: 체험 종료 후 15일 이내에 유료 구독으로 전환하지 않을 경우 자동 삭제.',
        highlight: true,
      }
    ],
  },
  {
    title: '3. 처리하는 개인정보 항목',
    paragraphs: [
      '필수항목: 이메일 주소, 비밀번호(암호화 보관), 이름(또는 병원명), 사업자 정보(사업자 번호 등), 결제 정보.',
      '선택항목: 전화번호, 직위, 문의 내역, 서비스 이용 과정에서 생성되는 데이터(재고 및 수술 기록 등).',
      '자동 수집항목: 서비스 이용 기록, 접속 로그, 쿠키, IP 주소, 브라우저 및 기기 정보.',
      '업데이트 운영항목: 앱 빌드 식별자, 업데이트 알림 노출/적용/지연 이벤트, 탭 동기화 상태값(서비스 안정성 및 보안 패치 적용 목적).',
    ],
  },
  {
    title: '4. 개인정보의 제3자 제공 및 처리 위탁',
    paragraphs: [
      '회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 이용자의 사전 동의가 있거나 법령의 규정에 의거한 경우에만 제공합니다.',
      '회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.',
      {
        type: 'table',
        headers: ['수탁업체', '위탁 업무 내용', '개인정보의 국외 이전 (해당 시)'],
        rows: [
          ['Supabase Inc.', '데이터베이스 및 클라우드 인프라 제공', '미국 (이용 시점부터 종료 시까지)'],
          ['결제 대행사(PG)', '유료 플랜 결제 및 정산 업무', '해당 사항 없음'],
          ['이메일/알림톡 발송사', '서비스 안내 및 마케팅 메시지 발송', '해당 사항 없음'],
        ],
      },
      {
        text: '※ Supabase를 통한 데이터 보관은 클라우드 서비스 특성상 국외(미국 등) 인프라를 활용하며, 회사는 전송 구간 암호화 및 접근 제어를 통해 안전하게 관리합니다.',
        highlight: true,
      }
    ],
  },
  {
    title: '5. 정보주체의 권리·의무 및 행사방법',
    paragraphs: [
      '이용자는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.',
      `권리 행사는 이메일(${BUSINESS_INFO.supportEmail})을 통해 할 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.`,
    ],
  },
  {
    title: '6. 개인정보의 안전성 확보 조치',
    paragraphs: [
      '회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.',
      '관리적 조치: 내부관리계획 수립 및 시행, 정기적 직원 교육.',
      '기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치.',
    ],
  },
  {
    title: '7. 개인정보 보호책임자',
    paragraphs: [
      `성명: ${BUSINESS_INFO.representativeName}`,
      '직책: 대표',
      `연락처: ${BUSINESS_INFO.supportEmail}`,
    ],
  },
  {
    title: '8. 서비스 업데이트 고지 및 로컬 저장소 사용 안내',
    paragraphs: [
      '회사는 보안 패치 및 서비스 품질 유지를 위해 Service Worker, 브라우저 캐시, LocalStorage, SessionStorage 등 기술을 사용할 수 있습니다.',
      '업데이트 지연 선택 시 지연 만료 시각 등의 최소 정보가 브라우저 LocalStorage에 저장되며, 강제 보안 업데이트 재적용 방지를 위한 식별값이 SessionStorage에 일시 저장될 수 있습니다.',
      {
        text: '강제 업데이트가 필요한 보안 패치의 경우, 회사는 서비스 안정성 확보를 위해 즉시 재로딩 또는 업데이트 적용을 진행할 수 있습니다.',
        highlight: true,
      },
      '브라우저 저장 정보는 서비스 운영 목적 외로 사용하지 않으며, 이용자는 브라우저 설정에서 쿠키/저장소를 삭제할 수 있습니다.',
    ],
  },
];

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = React.useState<string>('');

  const titleId = type === 'terms' ? 'legal-terms-title' : 'legal-privacy-title';
  const descriptionId = type === 'terms' ? 'legal-terms-desc' : 'legal-privacy-desc';
  const sections = useMemo(() => (type === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS), [type]);

  // Handle focus trapping and Escape key
  useEffect(() => {
    const previousFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    window.setTimeout(() => {
      getFocusable()[0]?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocused?.focus();
    };
  }, [onClose]);

  // Set up Intersection Observer for Table of Contents
  useEffect(() => {
    const sectionElements = document.querySelectorAll('section[id^="section-"]');

    // Fallback if no sections
    if (sectionElements.length === 0) return;

    // Initialize active section to the first one
    setActiveSectionId(sectionElements[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '-20% 0px -60% 0px', // Trigger when section is near top part of screen
        threshold: 0,
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element || !scrollContainerRef.current) return;

    scrollContainerRef.current.scrollTo({
      top: element.offsetTop - 40, // offset for some padding
      behavior: 'smooth'
    });
    setActiveSectionId(id);
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col pt-3"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="shrink-0 px-6 lg:px-10 py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur z-20">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${type === 'terms' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
              {type === 'terms' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              )}
            </div>
            <div>
              <h1 id={titleId} className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {type === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}
              </h1>
              <p id={descriptionId} className="text-xs font-semibold text-slate-400 mt-0.5 tracking-wide">시행일: {EFFECTIVE_DATE}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={type === 'terms' ? '이용약관 닫기' : '개인정보 처리방침 닫기'}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">

          {/* Scrollable Document Area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto w-full lg:w-auto p-6 sm:p-8 lg:p-10 order-2 lg:order-1 scroll-smooth"
          >
            <div className="max-w-3xl mx-auto pb-20">
              <div className="prose prose-slate max-w-none text-slate-600 leading-[1.8] space-y-12">
                {sections.map((section, sectionIdx) => {
                  const sectionId = `section-${sectionIdx}`;
                  return (
                    <section key={section.title} id={sectionId} className="scroll-mt-10 group">
                      <h3 className="text-lg font-black text-slate-800 mt-0 mb-5 pb-3 border-b border-slate-100 group-hover:border-slate-200 transition-colors">
                        {section.title}
                      </h3>
                      {section.paragraphs.length === 1 ? (
                        (() => {
                          const e = section.paragraphs[0];
                          if (typeof e === 'string') return <p className="text-[15px]">{e}</p>;
                          if ('type' in e && e.type === 'table') {
                            return (
                              <div className="overflow-x-auto my-6 rounded-xl border border-slate-200">
                                <table className="w-full text-left text-[14px] border-collapse bg-white">
                                  <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                      {e.headers.map((h, i) => (
                                        <th key={i} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {e.rows.map((row, i) => (
                                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        {row.map((cell, j) => (
                                          <td key={j} className="px-4 py-3 text-slate-600">{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          }
                          if ('text' in e) {
                            return (
                              <div className="my-6 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-5 shadow-sm">
                                <div className="flex gap-4">
                                  <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-lg shadow-sm w-9 h-9 flex items-center justify-center border border-indigo-50">
                                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <p className="m-0 font-medium text-[15px] leading-[1.7] text-indigo-900/90">{e.text}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()
                      ) : (
                        <ul className="space-y-4 list-none p-0 m-0">
                          {section.paragraphs.map((entry, idx) => {
                            if (typeof entry === 'string') {
                              return (
                                <li key={idx} className="flex gap-4 p-0">
                                  <span className="shrink-0 w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 mt-1">
                                    {idx + 1}
                                  </span>
                                  <span className="text-[15px] pt-1 text-slate-600 block flex-1">{entry}</span>
                                </li>
                              );
                            }
                            if ('type' in entry && entry.type === 'table') {
                              return (
                                <li key={idx} className="p-0">
                                  <div className="overflow-x-auto my-6 rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-[14px] border-collapse bg-white">
                                      <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                          {entry.headers.map((h, i) => (
                                            <th key={i} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {entry.rows.map((row, i) => (
                                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            {row.map((cell, j) => (
                                              <td key={j} className="px-4 py-3 text-slate-600">{cell}</td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </li>
                              );
                            }
                            if ('text' in entry) {
                              return (
                                <li key={idx} className="p-0">
                                  <div className="my-2 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-5 shadow-sm">
                                    <div className="flex gap-4">
                                      <div className="shrink-0 bg-white p-1.5 rounded-lg shadow-sm w-9 h-9 flex items-center justify-center border border-indigo-50">
                                        <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <p className="m-0 font-medium text-[15px] leading-[1.7] text-indigo-900/90 tracking-tight">{entry.text}</p>
                                    </div>
                                  </div>
                                </li>
                              );
                            }
                            return null;
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}

                <section className="mt-16 pt-8 border-t border-slate-200">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src="/denjoy_logo.png" alt="DenJOY Logo" className="w-8 h-auto object-contain opacity-90" />
                    </div>
                    <div className="space-y-3 flex-1 text-sm text-slate-500">
                      <h3 className="text-base font-black text-slate-800 mt-0 mb-1">사업자 정보</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                        <p><span className="font-semibold text-slate-700 w-24 inline-block">상호</span> {BUSINESS_INFO.companyDisplayName}</p>
                        <p><span className="font-semibold text-slate-700 w-24 inline-block">대표</span> {BUSINESS_INFO.representativeName}</p>
                        <p><span className="font-semibold text-slate-700 w-24 inline-block">사업자번호</span> {BUSINESS_INFO.businessRegistrationNumber}</p>
                        <p><span className="font-semibold text-slate-700 w-24 inline-block">통신판매업</span> {BUSINESS_INFO.ecommerceReportNumber}</p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-200/60 inline-flex items-center gap-2">
                        <span className="font-semibold text-slate-700">고객지원</span>
                        <a href={`mailto:${BUSINESS_INFO.supportEmail}`} className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium transition-all">{BUSINESS_INFO.supportEmail}</a>
                        <span className="text-xs text-slate-400 ml-1">(평일 10:00~17:00)</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Sticky Table of Contents (Desktop only) */}
          <div className="hidden lg:block w-72 shrink-0 border-l border-slate-100 bg-slate-50/30 p-8 overflow-y-auto order-1 lg:order-2">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              목차
            </h4>
            <nav className="space-y-1 relative">
              {/* Active Highlight Pill */}
              <div
                className="absolute left-0 w-full min-h-[36px] bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ease-out z-0"
                style={{
                  top: `${Math.max(0, sections.findIndex((_, i) => `section-${i}` === activeSectionId)) * 40}px`,
                  opacity: activeSectionId ? 1 : 0
                }}
              />

              {sections.map((section, idx) => {
                const id = `section-${idx}`;
                const isActive = activeSectionId === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`relative z-10 w-full text-left px-4 py-2 text-sm rounded-xl transition-all duration-200 flex items-center gap-3 group h-[36px] mt-1 first:mt-0 ${isActive
                      ? 'font-bold text-indigo-700'
                      : 'font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-500 scale-100' : 'bg-slate-300 scale-0 group-hover:scale-100'}`} />
                    <span className="truncate flex-1">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LegalModal;
