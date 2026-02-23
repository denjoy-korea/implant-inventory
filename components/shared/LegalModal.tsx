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
type ParagraphEntry = string | { text: string; highlight: true };

const EFFECTIVE_DATE = '2026년 2월 24일';

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
    title: '1. 개인정보 처리 목적',
    paragraphs: [
      '회원 식별, 서비스 제공, 결제·정산, 고객 문의 응대, 보안 및 부정 이용 방지, 서비스 품질 개선을 위해 개인정보를 처리합니다.',
      '의료기관 회원이 업로드한 수술기록 중 환자 관련 정보는 위탁받은 범위 내에서만 처리합니다.',
    ],
  },
  {
    title: '2. 처리 항목',
    paragraphs: [
      '필수: 이메일, 비밀번호(암호화), 이름, 병원 정보(해당 시), 서비스 이용 기록',
      '선택: 전화번호, 직위, 첨부 문서(예: 사업자등록증), 문의 내용',
      '자동 수집: 접속 로그, 브라우저·기기 정보, 쿠키, 이벤트 로그',
    ],
  },
  {
    title: '3. 보유 및 이용 기간',
    paragraphs: [
      '회원 정보는 회원 탈퇴 또는 계약 종료 시까지 보관하며, 법령에 따른 보관 의무가 있는 경우 해당 기간 동안 별도 보관합니다.',
      '결제 및 계약 관련 기록은 전자상거래법 등 관련 법령에 따라 최대 5년간 보관될 수 있습니다.',
      TRIAL_DATA_DELETION_POLICY_TEXT,
    ],
  },
  {
    title: '4. 제3자 제공 및 처리 위탁',
    paragraphs: [
      '회사는 법령 근거 또는 정보주체 동의가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.',
      '서비스 운영을 위해 결제 대행, 이메일 발송, 클라우드 인프라 운영 업무를 위탁할 수 있습니다.',
      '주요 인프라 제공사: Supabase Inc. (미국). 국외 이전이 필요한 경우 관련 법령에 따라 보호조치를 적용합니다.',
    ],
  },
  {
    title: '5. 정보주체의 권리',
    paragraphs: [
      '정보주체는 개인정보 열람, 정정, 삭제, 처리정지, 동의철회를 요청할 수 있습니다.',
      '요청은 고객지원 이메일을 통해 접수할 수 있으며, 회사는 관련 법령에 따라 지체 없이 조치합니다.',
    ],
  },
  {
    title: '6. 안전성 확보조치',
    paragraphs: [
      '회사는 접근권한 최소화, 전송·저장 구간 보호, 인증·권한 통제, 로그 모니터링 등 기술적·관리적 보호조치를 시행합니다.',
    ],
  },
  {
    title: '7. 쿠키 및 로그',
    paragraphs: [
      '서비스 개선과 통계 분석을 위해 쿠키 및 로그를 사용할 수 있습니다. 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.',
    ],
  },
  {
    title: '8. 개인정보 보호책임자 및 문의',
    paragraphs: [
      `책임자: ${BUSINESS_INFO.representativeName} (대표)`,
      `문의: ${BUSINESS_INFO.supportEmail}`,
    ],
  },
  {
    title: '9. 방침 변경',
    paragraphs: [
      '본 방침은 시행일로부터 적용되며, 내용이 변경될 경우 서비스 내 공지사항을 통해 안내합니다.',
    ],
  },
];

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const titleId = type === 'terms' ? 'legal-terms-title' : 'legal-privacy-title';
  const descriptionId = type === 'terms' ? 'legal-terms-desc' : 'legal-privacy-desc';
  const sections = useMemo(() => (type === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS), [type]);

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

  return (
    <div className="fixed inset-0 z-[300] bg-white/95 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-w-3xl mx-auto px-6 py-16 bg-white min-h-screen"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={type === 'terms' ? '이용약관 닫기' : '개인정보 처리방침 닫기'}
          className="fixed top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-12">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'terms' ? 'bg-gradient-to-br from-indigo-100 to-purple-100' : 'bg-gradient-to-br from-emerald-100 to-teal-100'}`}>
            {type === 'terms' ? (
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h8.25A2.25 2.25 0 0118 6v12a2.25 2.25 0 01-2.25 2.25H7.5A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75zm2.25 4.5h4.5m-4.5 3h4.5m-4.5 3h4.5" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            )}
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${type === 'terms' ? 'text-indigo-500' : 'text-emerald-500'}`}>
            {type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </p>
          <h1 id={titleId} className="text-3xl font-black text-slate-900">
            {type === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}
          </h1>
          <p id={descriptionId} className="text-sm text-slate-400 mt-2">시행일: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
          {sections.map((section) => (
            <section key={section.title} className="mb-9">
              <h3 className="text-base font-black text-slate-900 mt-0 mb-3">{section.title}</h3>
              {section.paragraphs.map((entry) => {
                if (typeof entry === 'string') {
                  return <p key={entry}>{entry}</p>;
                }
                return (
                  <div
                    key={entry.text}
                    className="my-3 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <p className="m-0 font-medium leading-relaxed text-amber-900">{entry.text}</p>
                  </div>
                );
              })}
            </section>
          ))}

          <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <h3 className="text-base font-black text-slate-900 mt-0 mb-2">사업자 정보</h3>
            <p>상호: {BUSINESS_INFO.companyDisplayName}</p>
            <p>대표: {BUSINESS_INFO.representativeName}</p>
            <p>사업자등록번호: {BUSINESS_INFO.businessRegistrationNumber}</p>
            <p>통신판매업 신고번호: {BUSINESS_INFO.ecommerceReportNumber}</p>
            <p>고객지원: {BUSINESS_INFO.supportEmail} (평일 10:00~17:00)</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
