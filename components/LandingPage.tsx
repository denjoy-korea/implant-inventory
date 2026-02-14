
import React from 'react';
import RefractionEffect from './RefractionEffect';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative flex flex-col justify-center items-center pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-200"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-400"></div>
        </div>
        
        <div className="absolute inset-0 z-0 opacity-40">
           <RefractionEffect />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 shadow-sm mb-8 animate-fade-in-up">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-bold text-slate-800 tracking-wide">DentWeb Data Processor v2.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-tight animate-fade-in-up animation-delay-200">
            치과 데이터 관리의 <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">새로운 기준</span>
          </h1>
          
          <p className="mt-6 text-xl md:text-2xl leading-relaxed text-slate-600 font-medium max-w-2xl mx-auto text-balance animate-fade-in-up animation-delay-400">
            복잡한 덴트웹 데이터를 <strong className="text-slate-900">단 3초 만에</strong> 시각화하고 분석하세요.
            <br className="hidden md:block" /> 
            수동 작업 없는 완벽한 재고 관리가 시작됩니다.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up animation-delay-400">
            <button
              onClick={onGetStarted}
              className="group relative px-8 py-4 bg-slate-900 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center gap-3">
                지금 무료로 시작하기
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <button className="px-8 py-4 bg-white/50 backdrop-blur-sm text-slate-700 text-lg font-bold rounded-2xl hover:bg-white/80 transition-all duration-300 border border-slate-200/60 shadow-sm hover:translate-y-[-2px]">
              기능 둘러보기
            </button>
          </div>
        </div>

        {/* Dashboard Mockup - 3D Perspective */}
        <div className="mt-20 relative z-10 w-full max-w-6xl mx-auto px-4 perspective-1000 animate-fade-in-up animation-delay-400">
            <div className="relative rounded-2xl bg-slate-900/5 p-2 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out-back origin-center">
             <div className="rounded-xl bg-white shadow-inner overflow-hidden border border-slate-200/50 aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="text-slate-400 font-medium">Dashboard Preview</span>
                </div>
             </div>
            </div>
             <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur-2xl opacity-20 -z-10"></div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
                 <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase">Key Features</h2>
                 <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">병원 운영의 품격을 높이는 기능</p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-indigo-100"></div>
              <div className="relative z-10">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white shadow-lg shadow-indigo-100 mb-6 text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">스마트 데이터 정규화</h3>
                <p className="text-slate-500 leading-relaxed">
                   다양한 제조사와 브랜드의 파편화된 이름을 표준 규격으로 자동 변환합니다. 오타 자동 수정 기능으로 
                   데이터의 정확도를 99.9%까지 끌어올립니다.
                </p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="group relative p-8 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-purple-100"></div>
               <div className="relative z-10">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white shadow-lg shadow-purple-100 mb-6 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">자동 재고 분석</h3>
                <p className="text-slate-500 leading-relaxed">
                   수술 기록을 기반으로 실시간 소모량을 분석하여 적정 재고량을 제안합니다. 과재고 및 품절을 예방하여
                   병원 운영 비용을 최적화하세요.
                </p>
              </div>
            </div>
            
             {/* Feature 3 */}
             <div className="group relative p-8 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-blue-100"></div>
               <div className="relative z-10">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white shadow-lg shadow-blue-100 mb-6 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                     <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                     </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">원클릭 리포트</h3>
                <p className="text-slate-500 leading-relaxed">
                   가공된 데이터를 클릭 한 번으로 엑셀 파일로 내려받으세요. 
                   병원 내부 양식에 100% 호환되는 구조로 즉시 보고 및 공유가 가능합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
         <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                <div className="p-6">
                    <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2">99.9%</div>
                    <div className="text-slate-400 font-medium text-sm lg:text-base">데이터 정확도</div>
                </div>
                 <div className="p-6">
                    <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2">3s</div>
                    <div className="text-slate-400 font-medium text-sm lg:text-base">평균 처리 시간</div>
                </div>
                 <div className="p-6">
                    <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2">100+</div>
                    <div className="text-slate-400 font-medium text-sm lg:text-base">지원 임플란트 브랜드</div>
                </div>
                 <div className="p-6">
                    <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2">0원</div>
                    <div className="text-slate-400 font-medium text-sm lg:text-base">도입 비용</div>
                </div>
            </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase">Testimonials</h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">실제 사용 후기</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: '김OO 원장', clinic: '서울 강남 S치과', text: '덴트웹 데이터 정리에 매주 2시간씩 쓰던 시간이 사라졌습니다. 업로드 한 번이면 브랜드별 재고가 한눈에 들어와요.', role: '원장' },
              { name: '박OO 실장', clinic: '부산 H치과의원', text: '수술 기록과 재고가 자동으로 연동되니까, 어떤 사이즈가 부족한지 미리 알 수 있어서 발주 실수가 확 줄었어요.', role: '실장' },
              { name: '이OO 매니저', clinic: '대구 M치과 네트워크', text: '3개 지점 재고를 한 곳에서 관리할 수 있게 됐습니다. 지점별 소모 패턴이 달라서 정말 유용하게 쓰고 있어요.', role: '매니저' },
            ].map((t, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <svg key={si} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed flex-1 mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.clinic} &middot; {t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
         <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-sm">© 2024 Implant Inventory Pro. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Terms of Service</a>
                <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Contact</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
