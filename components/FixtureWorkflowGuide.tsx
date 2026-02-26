
import React, { useState } from 'react';

const STEPS = [
  {
    num: 1,
    title: '제조사 선택',
    desc: '사용하는 제조사만 ON으로 설정',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    ),
    color: 'indigo',
  },
  {
    num: 2,
    title: '브랜드 필터링',
    desc: '사용하는 브랜드만 남기고 미사용 처리',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
    ),
    color: 'violet',
  },
  {
    num: 3,
    title: '길이 필터링',
    desc: '사용하는 픽스쳐 길이만 선택',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
    ),
    color: 'blue',
  },
  {
    num: 4,
    title: '세부 품목 정리',
    desc: '목록에서 미사용 픽스쳐를 개별 체크',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    ),
    color: 'emerald',
  },
  {
    num: 5,
    title: '교환/청구 확장',
    desc: '수술중교환 항목 + 보험청구 항목 자동 생성',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
    ),
    color: 'rose',
  },
  {
    num: 6,
    title: '덴트웹 반영',
    desc: '엑셀 다운로드 후 덴트웹 픽스처 설정에 등록',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
    ),
    color: 'amber',
  },
  {
    num: 7,
    title: '재고 마스터 반영',
    desc: '정리된 품목을 재고 마스터로 전송',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    ),
    color: 'emerald',
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', lightBg: 'bg-indigo-50' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-200', lightBg: 'bg-violet-50' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', lightBg: 'bg-blue-50' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200', lightBg: 'bg-rose-50' },
  amber: { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-200', lightBg: 'bg-amber-50' },
};

interface FixtureWorkflowGuideProps {
  /** 완료된 스텝 번호 배열 (예: [1, 2, 5]) */
  completedSteps?: number[];
}

const FixtureWorkflowGuide: React.FC<FixtureWorkflowGuideProps> = ({ completedSteps = [] }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800">데이터 설정 가이드</h3>
            <p className="text-[11px] text-slate-400">품목 정리 워크플로우를 확인하세요</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {/* Flowchart */}
          <div className="flex items-center gap-0 overflow-x-auto pb-2 scrollbar-hide">
            {STEPS.map((step, i) => {
              const c = COLOR_MAP[step.color];
              const done = completedSteps.includes(step.num);
              return (
                <div key={step.num} className="flex items-center flex-shrink-0">
                  <div className={`flex flex-col items-center gap-1.5 px-2 min-w-[90px]`}>
                    <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${done ? `${c.bg} text-white` : `${c.lightBg} ${c.text}`}`}>
                      {done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : step.icon}
                    </div>
                    <span className={`text-[10px] font-bold ${done ? c.text : 'text-slate-400'}`}>STEP {step.num}</span>
                    <span className={`text-[11px] font-bold text-center leading-tight ${done ? 'text-slate-700' : 'text-slate-500'}`}>{step.title}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <svg className={`w-5 h-5 flex-shrink-0 -mx-0.5 ${done && completedSteps.includes(STEPS[i + 1]?.num) ? c.text : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STEPS.map(step => {
              const c = COLOR_MAP[step.color];
              const done = completedSteps.includes(step.num);
              return (
                <div key={step.num} className={`flex items-start gap-3 p-3 rounded-xl border ${done ? 'border-emerald-200 bg-emerald-50/30' : `${c.border} ${c.lightBg}/30`}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-black ${done ? 'bg-emerald-500 text-white' : `${c.bg} text-white`}`}>
                    {done ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : step.num}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${done ? 'text-emerald-700' : 'text-slate-700'}`}>{step.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Usage Tips */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              활용 안내
            </h4>
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-bold rounded flex-shrink-0 mt-px">교환</span>
                수술 중 교환 발생 시 해당 제조사의 수술중교환 항목을 선택하여 기록합니다. 교환 관리 메뉴에서 제조사별 교환 신청에 활용됩니다.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold rounded flex-shrink-0 mt-px">청구</span>
                덴트웹 2단계 청구 시 수술기록지에서 보험청구를 선택합니다. 보험청구 건수 통계 자료로 활용됩니다.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[9px] font-bold rounded flex-shrink-0 mt-px">덴트웹</span>
                하단의 <span className="font-bold text-slate-600">엑셀 다운로드</span> 후, 덴트웹 <span className="font-bold text-slate-600">환경설정 &gt; 진료와 관련된 덴트웹 설정 &gt; 임플란트 픽스처 설정</span> 메뉴에서 팝업이 뜨면 <span className="font-bold text-slate-600">파일로 저장</span>을 눌러 다운로드 받은 파일을 등록하고 저장합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixtureWorkflowGuide;
