
import React, { useEffect } from 'react';

interface ContactPageProps {
  onGetStarted: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onGetStarted }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Main Content - 2 Column */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

            {/* Left Column - Info */}
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight mb-6">
                DenJOY 팀에<br />문의하기
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed mb-10">
                도입 상담, 요금제 안내, 맞춤 기능 문의 등<br />
                무엇이든 편하게 연락 주세요.
              </p>

              {/* Trust Badges */}
              <p className="text-sm text-slate-400 font-medium mb-4">
                이미 많은 치과에서 사용하고 있습니다
              </p>
              <div className="flex items-center gap-6 mb-12">
                {['S치과', 'H치과의원', 'M네트워크', 'Y덴탈'].map((name, i) => (
                  <div key={i} className="text-slate-300 font-black text-lg tracking-tight">
                    {name}
                  </div>
                ))}
              </div>

              {/* Testimonial Card */}
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed mb-6">
                  "도입 문의 후 하루 만에 세팅 완료됐습니다. 덴트웹 데이터 정리에 매주 2시간씩 쓰던 시간이 사라졌고, 재고 파악이 한눈에 되니까 발주 실수도 확 줄었어요."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">김</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">김OO 원장</p>
                    <p className="text-xs text-slate-400">서울 강남 S치과</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div>
              <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-6">문의 양식</h2>
                <form onSubmit={(e) => { e.preventDefault(); alert('문의가 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.'); }} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">병원명 <span className="text-rose-500">*</span></label>
                      <input type="text" required placeholder="OO치과의원" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">담당자명 <span className="text-rose-500">*</span></label>
                      <input type="text" required placeholder="홍길동" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">이메일 <span className="text-rose-500">*</span></label>
                      <input type="email" required placeholder="email@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">직위</label>
                      <input type="text" placeholder="원장 / 실장 / 매니저" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">연락처 <span className="text-rose-500">*</span></label>
                      <input type="tel" required placeholder="010-0000-0000" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">주간 임플란트 수술 건수 <span className="text-rose-500">*</span></label>
                      <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-slate-700 bg-white">
                        <option value="">선택해 주세요</option>
                        <option>주 5건 미만</option>
                        <option>주 5~15건</option>
                        <option>주 15~30건</option>
                        <option>주 30건 이상</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">문의 유형 <span className="text-rose-500">*</span></label>
                    <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-slate-700 bg-white">
                      <option value="">선택해 주세요</option>
                      <option>도입 상담</option>
                      <option>요금제 안내</option>
                      <option>기능 문의</option>
                      <option>기술 지원</option>
                      <option>파트너십 제안</option>
                      <option>기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">상세 내용 <span className="text-rose-500">*</span></label>
                    <textarea required rows={5} placeholder="궁금하신 점을 자유롭게 작성해 주세요." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none" />
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <input type="checkbox" id="agree" className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="agree" className="text-xs text-slate-500 leading-relaxed">
                      개인정보 수집 및 이용에 동의합니다. 수집된 정보는 문의 응대 목적으로만 사용됩니다.
                    </label>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 mt-2">
                    문의 보내기
                  </button>
                </form>
                <p className="text-xs text-slate-400 mt-4 text-center">
                  기술 지원이 필요하시면 <span className="text-indigo-600 font-medium">admin@denjoy.info</span>로 이메일을 보내주세요.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bottom Testimonials */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: '박OO 실장', clinic: '부산 H치과의원', text: '"수술 기록과 재고가 자동으로 연동되니까, 어떤 사이즈가 부족한지 미리 알 수 있어서 발주 실수가 확 줄었어요."' },
              { name: '이OO 매니저', clinic: '대구 M치과 네트워크', text: '"3개 지점 재고를 한 곳에서 관리할 수 있게 됐습니다. 지점별 소모 패턴이 달라서 정말 유용해요."' },
              { name: '최OO 원장', clinic: '인천 Y덴탈', text: '"엑셀로 하루 종일 걸리던 작업이 3초면 끝납니다. 직원들 업무 부담이 크게 줄었어요."' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100">
                <p className="text-slate-600 leading-relaxed mb-6">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.clinic}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 text-sm">&copy; 2024 Implant Inventory Pro. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
