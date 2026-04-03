import React, { useCallback } from 'react';

interface HomepageFooterProps {
  onGoToContact: () => void;
  onGoToTerms: () => void;
  onGoToPrivacy: () => void;
}

const HomepageFooter: React.FC<HomepageFooterProps> = ({
  onGoToContact,
  onGoToTerms,
  onGoToPrivacy,
}) => {
  const currentYear = new Date().getFullYear();
  const goHome = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr_0.7fr] gap-10">
          <div>
            <button type="button" onClick={goHome} className="flex items-center gap-3 mb-5 group text-left">
              <img
                src="/denjoy_logo_full.png"
                alt="DenJOY Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white"
              />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">denjoy.info</p>
                <span className="text-lg font-black text-white">디앤조이(DenJOY)</span>
              </div>
            </button>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              메인 홈페이지는 DenJOY 브랜드 전체를 설명하고, 각 솔루션은 자기만의 랜딩페이지에서 더 깊게 설명하는 구조를 지향합니다.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed max-w-md mt-3">
              임상 교육, 병원 컨설팅, 디지털 솔루션, 성장 커뮤니티를 한 브랜드 아래에서 연결합니다.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.28em] text-slate-500 mb-5">Company</h4>
            <ul className="space-y-3 text-sm flex flex-col items-start">
              <li>
                <span className="text-slate-500">대표</span>
                <span className="text-slate-300 ml-2">맹준호</span>
              </li>
              <li>
                <span className="text-slate-500">사업자등록번호</span>
                <span className="text-slate-300 ml-2">528-22-01076</span>
              </li>
              <li className="text-left">
                <span className="text-slate-500">통신판매업</span>
                <span className="text-slate-300 ml-2 block mt-0.5">2026-의정부홍선-0149</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.28em] text-slate-500 mb-5">Contact</h4>
            <ul className="space-y-3 text-sm flex flex-col items-start">
              <li className="flex items-center gap-2">
                <svg aria-hidden="true" className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:admin@denjoy.info" className="text-slate-300 hover:text-white transition-colors">
                  admin@denjoy.info
                </a>
              </li>
              <li className="flex items-start gap-2 text-left">
                <svg aria-hidden="true" className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-slate-300 leading-relaxed">
                  평일 09:00 – 18:00
                  <span className="block text-slate-500 text-xs mt-0.5">(점심 12:30 – 13:30)</span>
                </span>
              </li>
              <li className="pt-2">
                <button type="button" onClick={onGoToContact} className="inline-flex rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-slate-600 hover:bg-slate-800">
                  문의 남기기
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-xs">
            © {currentYear} DenJOY. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-600">
            <button type="button" onClick={onGoToTerms} className="hover:text-slate-400 transition-colors">이용약관</button>
            <button type="button" onClick={onGoToPrivacy} className="hover:text-slate-400 transition-colors">개인정보처리방침</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomepageFooter;
