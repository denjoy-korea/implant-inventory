
import React, { useState } from 'react';

interface RawDataUploadGuideProps {
  onUploadClick: () => void;
  hasExistingData: boolean;
  onGoToEdit: () => void;
}

const WORKFLOW_STEPS = [
  {
    num: 1,
    title: '엑셀 파일 업로드',
    desc: '덴트웹에서 다운로드한 픽스쳐 엑셀 파일을 업로드합니다.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
    ),
    page: '로우데이터 업로드',
  },
  {
    num: 2,
    title: '데이터 설정/가공',
    desc: '제조사, 브랜드, 규격을 필터링하고 미사용 품목을 정리합니다.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    ),
    page: '데이터 설정/가공',
  },
  {
    num: 3,
    title: '재고 마스터 반영',
    desc: '정리된 품목 데이터를 재고 마스터에 등록합니다.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    ),
    page: '재고 관리 마스터',
  },
  {
    num: 4,
    title: '덴트웹 등록',
    desc: '가공된 엑셀을 다운로드하여 덴트웹에 재등록합니다.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    ),
    page: '덴트웹 환경설정',
  },
];

const FAQ_ITEMS = [
  {
    q: '어떤 파일을 업로드해야 하나요?',
    a: '덴트웹 > 환경설정 > 진료와 관련된 덴트웹 설정 > 임플란트 픽스처 설정에서 다운로드한 .xlsx 엑셀 파일을 업로드합니다.',
  },
  {
    q: '파일 형식이 맞지 않으면 어떻게 되나요?',
    a: '.xlsx 형식의 엑셀 파일만 지원됩니다. 파일 형식이 맞지 않는 경우 업로드가 실패하며, 덴트웹에서 다시 다운로드하여 시도해 주세요.',
  },
  {
    q: '기존 데이터가 있는 상태에서 다시 업로드하면?',
    a: '새 파일 업로드 시 기존 데이터 설정/가공 화면의 데이터가 교체됩니다. 재고 마스터에 이미 반영된 데이터는 영향받지 않습니다.',
  },
  {
    q: '수술기록은 어디서 업로드하나요?',
    a: '수술기록은 사이드바의 "수술 기록 데이터베이스" 메뉴에서 별도로 업로드합니다. 이 페이지는 픽스쳐(품목) 데이터 전용입니다.',
  },
];

const RawDataUploadGuide: React.FC<RawDataUploadGuideProps> = ({ onUploadClick, hasExistingData, onGoToEdit }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Upload Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[11px] font-medium text-white/90">STEP 1 of 4</span>
            </div>
            <h2 className="text-2xl font-black leading-tight">
              덴트웹 픽스쳐 데이터를<br />업로드해 주세요
            </h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              덴트웹에서 다운로드한 임플란트 픽스쳐 엑셀 파일(.xlsx)을
              업로드하면, 품목 정리 및 재고 관리를 시작할 수 있습니다.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onUploadClick}
                className="px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg shadow-indigo-900/30 hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                엑셀 파일 업로드
              </button>
              {hasExistingData && (
                <button
                  onClick={onGoToEdit}
                  className="px-5 py-3 bg-white/15 backdrop-blur-sm text-white font-bold rounded-xl border border-white/20 hover:bg-white/25 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  데이터 설정으로 이동
                </button>
              )}
            </div>
          </div>
          {/* Upload illustration */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onUploadClick}
              aria-label="엑셀 파일 업로드"
              className="w-56 h-44 border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/50 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white/80">.xlsx 파일을 선택하세요</p>
                <p className="text-[10px] text-white/50 mt-0.5">또는 상단 업로드 버튼 클릭</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">전체 워크플로우</h3>
            <p className="text-[11px] text-slate-400">업로드부터 덴트웹 반영까지 4단계</p>
          </div>
        </div>

        {/* Steps Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div key={step.num} className="relative">
              <div className={`p-4 rounded-xl border ${idx === 0 ? 'border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-100' : 'border-slate-100 bg-slate-50/30'} space-y-3`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step.icon}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    Step {step.num}
                  </span>
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${idx === 0 ? 'text-indigo-800' : 'text-slate-700'}`}>{step.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
                <div className={`text-[10px] font-medium px-2 py-1 rounded-md inline-block ${idx === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  {step.page}
                </div>
              </div>
              {/* Arrow connector for md+ */}
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 text-slate-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Guide Section - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Guide */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">파일 준비 가이드</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-black mt-0.5">1</div>
              <div>
                <p className="text-xs font-bold text-slate-700">덴트웹에서 파일 다운로드</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  덴트웹 &gt; 환경설정 &gt; 진료와 관련된 덴트웹 설정 &gt; 임플란트 픽스처 설정 &gt; <span className="font-semibold text-slate-600">파일로 저장</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-black mt-0.5">2</div>
              <div>
                <p className="text-xs font-bold text-slate-700">이 페이지에서 업로드</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  상단의 <span className="font-semibold text-slate-600">업로드 버튼</span> 또는 위 영역을 클릭하여 .xlsx 파일을 선택합니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-black mt-0.5">3</div>
              <div>
                <p className="text-xs font-bold text-slate-700">자동 이동</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  업로드 완료 시 <span className="font-semibold text-slate-600">데이터 설정/가공</span> 페이지로 자동 이동하여 품목 정리를 시작합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">업로드 요구사항</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">파일 형식</p>
                <p className="text-[11px] text-slate-400">.xlsx (엑셀) 형식만 지원</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">데이터 출처</p>
                <p className="text-[11px] text-slate-400">덴트웹 임플란트 픽스처 설정 파일</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">주의사항</p>
                <p className="text-[11px] text-slate-400">파일 수정 없이 원본 그대로 업로드하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">데이터 보안</p>
                <p className="text-[11px] text-slate-400">업로드 데이터는 병원 계정에만 저장됩니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">자주 묻는 질문</h3>
        </div>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
              >
                <span className="text-xs font-bold text-slate-700 text-left">{item.q}</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-3 ${openFaq === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RawDataUploadGuide;
