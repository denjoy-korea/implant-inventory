import React from 'react';
import { HospitalPlanState, PLAN_NAMES, User } from '../types';

interface MyPageProps {
  user: User;
  hospitalName: string;
  planState: HospitalPlanState | null;
  isSystemAdmin: boolean;
  onGoToDashboard: () => void;
  onGoToAdminPanel?: () => void;
  onGoToPricing: () => void;
  onGoToContact: () => void;
  onProfileClick: () => void;
}

const MyPage: React.FC<MyPageProps> = ({
  user,
  hospitalName,
  planState,
  isSystemAdmin,
  onGoToDashboard,
  onGoToAdminPanel,
  onGoToPricing,
  onGoToContact,
  onProfileClick,
}) => {
  const planName = planState ? PLAN_NAMES[planState.plan] : 'Free';
  const hasExpiry = Boolean(planState?.expiresAt);
  const isExpired = hasExpiry && (planState?.daysUntilExpiry ?? 0) <= 0;
  const daysLeft = hasExpiry ? (planState?.daysUntilExpiry ?? null) : null;

  const serviceCards = [
    {
      title: '임플란트 재고관리',
      description: '덴트웹 연동 기반 자동화 재고·발주 시스템',
      label: isExpired ? '만료' : planName,
      labelTone: isExpired
        ? 'bg-rose-50 text-rose-600'
        : daysLeft !== null && daysLeft <= 7
        ? 'bg-amber-50 text-amber-600'
        : 'bg-emerald-50 text-emerald-600',
      iconTone: 'bg-indigo-50 group-hover:bg-indigo-100',
      titleTone: 'text-slate-900',
      descriptionTone: 'text-slate-500',
      actionTone: 'text-indigo-600',
      actionLabel: '워크스페이스 열기',
      hint: daysLeft !== null && !isExpired && daysLeft <= 14 ? `${daysLeft}일 후 만료` : null,
      className: 'group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 p-6 text-left transition-all hover:-translate-y-0.5',
      onClick: onGoToDashboard,
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    ...(isSystemAdmin && onGoToAdminPanel
      ? [{
          title: '서비스 관리자',
          description: '회원, 결제, 강의 운영을 한 곳에서 관리합니다.',
          label: '운영자',
          labelTone: 'bg-rose-50 text-rose-600',
          iconTone: 'bg-rose-50 group-hover:bg-rose-100',
          titleTone: 'text-slate-900',
          descriptionTone: 'text-slate-500',
          actionTone: 'text-rose-600',
          actionLabel: '관리자 페이지 열기',
          hint: '운영 권한 전용 페이지',
          className: 'group bg-white rounded-2xl border border-rose-200 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10 p-6 text-left transition-all hover:-translate-y-0.5',
          onClick: onGoToAdminPanel,
          icon: (
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18l-1.813-2.096a5.25 5.25 0 0 1-1.584-3.726V7.5a2.25 2.25 0 0 1 2.25-2.25h8.294a2.25 2.25 0 0 1 2.25 2.25v4.678a5.25 5.25 0 0 1-1.584 3.726L15 18l-.813-2.096a4.5 4.5 0 0 0-4.374 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v3.75m0 0 1.5 1.5M12 12l-1.5 1.5" />
            </svg>
          ),
        }]
      : []),
    {
      title: '병원 경영 컨설팅',
      description: '맞춤형 경영 진단 및 개선 솔루션',
      label: '준비 중',
      labelTone: 'bg-slate-50 text-slate-400',
      iconTone: 'bg-slate-50',
      titleTone: 'text-slate-500',
      descriptionTone: 'text-slate-400',
      actionTone: 'text-slate-400',
      actionLabel: null,
      hint: null,
      className: 'bg-white rounded-2xl border border-dashed border-slate-200 p-6 opacity-60',
      onClick: undefined,
      icon: (
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
      ),
    },
    {
      title: '임상 교육 플랫폼',
      description: '치과 전문가를 위한 온라인 강의',
      label: '준비 중',
      labelTone: 'bg-slate-50 text-slate-400',
      iconTone: 'bg-slate-50',
      titleTone: 'text-slate-500',
      descriptionTone: 'text-slate-400',
      actionTone: 'text-slate-400',
      actionLabel: null,
      hint: null,
      className: 'bg-white rounded-2xl border border-dashed border-slate-200 p-6 opacity-60',
      onClick: undefined,
      icon: (
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      label: '요금제',
      desc: '플랜 변경 · 결제',
      color: 'text-indigo-600 bg-indigo-50',
      onClick: onGoToPricing,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
      ),
    },
    {
      label: '계정 설정',
      desc: '프로필 · 보안',
      color: 'text-slate-600 bg-slate-50',
      onClick: onProfileClick,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
    {
      label: '워크스페이스',
      desc: '재고관리 열기',
      color: 'text-violet-600 bg-violet-50',
      onClick: onGoToDashboard,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    ...(isSystemAdmin && onGoToAdminPanel
      ? [{
          label: '관리자',
          desc: '회원 · 결제 · 강의',
          color: 'text-rose-600 bg-rose-50',
          onClick: onGoToAdminPanel,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v5.25a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 18v-5.25a2.25 2.25 0 0 1 2.25-2.25Z" />
            </svg>
          ),
        }]
      : []),
    {
      label: '문의하기',
      desc: '상담 · 지원',
      color: 'text-emerald-600 bg-emerald-50',
      onClick: onGoToContact,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <section>
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">내 서비스</h2>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSystemAdmin ? 'xl:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            {serviceCards.map((item) => {
              const CardTag = item.onClick ? 'button' : 'div';

              return (
                <CardTag
                  key={item.title}
                  {...(item.onClick ? { onClick: item.onClick, type: 'button' as const } : {})}
                  className={item.className}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${item.iconTone}`}>
                      {item.icon}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${item.labelTone}`}>
                      {item.label}
                    </span>
                  </div>
                  <h3 className={`text-[16px] font-bold mb-1 ${item.titleTone}`}>{item.title}</h3>
                  <p className={`text-[13px] leading-relaxed ${item.descriptionTone}`}>{item.description}</p>
                  {item.hint && (
                    <p className={`text-[11px] font-semibold mt-3 ${item.actionTone}`}>{item.hint}</p>
                  )}
                  {item.actionLabel && (
                    <div className={`mt-4 flex items-center gap-1 text-[13px] font-semibold transition-all ${item.actionTone} group-hover:gap-2`}>
                      {item.actionLabel}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </CardTag>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">바로가기</h2>
          <div className={`grid grid-cols-2 ${isSystemAdmin ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
            {quickActions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm p-4 text-left transition-all"
              >
                <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                  {item.icon}
                </div>
                <p className="text-[14px] font-bold text-slate-800">{item.label}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyPage;
