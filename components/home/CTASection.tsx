import React from 'react';

interface CTASectionProps {
  onGoToContact: () => void;
  onOpenInventorySolution: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({
  onGoToContact,
  onOpenInventorySolution,
}) => {
  return (
    <section className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-indigo-900 py-16 px-8 shadow-2xl shadow-indigo-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] opacity-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" aria-hidden="true" />

          {/* Urgency badge */}
          <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-sm font-bold text-white">치과 IT 컨설팅 선착순 제공</span>
          </div>

          <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            교육, 컨설팅, 솔루션 —
            <br />
            <span className="text-amber-300">DenJOY와 함께 시작하세요</span>
          </h2>
          <p className="relative text-lg text-indigo-200 mb-3 max-w-2xl mx-auto leading-relaxed">
            재고관리 솔루션부터 병원 컨설팅, 실전 교육까지 — 치과 운영의 모든 고민을 DenJOY가 함께 풀어갑니다.
          </p>
          <p className="relative text-indigo-300/80 mb-10 text-sm">
            선착순 무료 컨설팅 제공 중
          </p>

          <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGoToContact}
              className="px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 active:scale-95 transition-all shadow-lg flex items-center gap-2 justify-center text-lg"
            >
              무료 상담 신청하기
            </button>
            <button
              onClick={onOpenInventorySolution}
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 active:scale-95 transition-all border border-white/20 flex items-center justify-center text-lg"
            >
              솔루션 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
