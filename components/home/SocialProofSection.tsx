import React from 'react';

const TESTIMONIALS = [
  {
    quote: '재고 파악에 쓰던 시간이 확 줄었습니다. 수술 전에 재고 확인하러 뛰어다니지 않아도 되니 진료에만 집중할 수 있어요.',
    role: '원장',
  },
  {
    quote: '컨설팅을 받고 나서 어디서부터 손대야 할지 명확해졌습니다. 막연했던 운영 문제가 항목별로 정리되더라고요.',
    role: '실장',
  },
  {
    quote: 'HR 기준도 없고 재고도 제각각이었는데, DenJOY를 통해 병원 전체 운영 흐름을 다시 세울 수 있었습니다.',
    role: '운영 담당자',
  },
];

const SocialProofSection: React.FC = () => {
  return (
    <section id="home-proof" className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="flex -space-x-2" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-300 to-indigo-500 border-2 border-white shadow-sm" />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-500">실제 고객 피드백</span>
          </div>
          <p className="text-sm text-indigo-500 font-medium mb-2">SOCIAL PROOF</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
            현장에서 일하는 분들의
            <span className="block gradient-text-purple">실제 이야기입니다</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto mt-4">
            교육, 컨설팅, 솔루션을 통해 병원 운영을 바꿔온 의료진의 경험을 공유합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item) => (
            <div key={item.quote} className="card-premium glow-box flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-yellow-400 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.069 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.196-1.539-1.118l1.068-3.292a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed font-medium mb-6">"{item.quote}"</p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                  {item.role[0]}
                </div>
                <p className="font-bold text-gray-800">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
