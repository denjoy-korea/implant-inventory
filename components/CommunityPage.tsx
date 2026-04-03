import React, { useEffect } from 'react';
import HomepageHeader from './home/HomepageHeader';
import HomepageFooter from './home/HomepageFooter';
import { BrandPageProps } from './ConsultingPage';

const CommunityPage: React.FC<BrandPageProps> = ({
  user, onGoToLogin, onGoToSignup, onGoToContact, onNavigate, onGoToTerms, onGoToPrivacy, onGoToMyPage
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-mesh text-slate-900 overflow-x-hidden flex flex-col">
      <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-pulse-glow" aria-hidden="true" />
      <div className="orb orb-blue w-[500px] h-[500px] top-1/3 -right-40 animate-pulse-glow" aria-hidden="true" style={{ animationDelay: '1s' }} />

      <HomepageHeader
        currentView="community"
        user={user}
        onGoToLogin={onGoToLogin}
        onGoToSignup={onGoToSignup}
        onGoToContact={onGoToContact}
        onNavigate={onNavigate}
        onGoToMyPage={onGoToMyPage}
      />

      <main className="flex-1 relative z-10 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-indigo-600 font-bold tracking-widest text-sm uppercase mb-3">Community</p>
            <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              커뮤니티
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              건강하게 성장하는 원장님, 실장님들의 네트워킹 공간입니다.
            </p>
          </div>

          <div className="card-premium max-w-4xl mx-auto min-h-[400px] flex items-center justify-center text-slate-400">
            <p>콘텐츠 준비 중입니다.</p>
          </div>
        </div>
      </main>

      <HomepageFooter onGoToContact={onGoToContact} onGoToTerms={onGoToTerms} onGoToPrivacy={onGoToPrivacy} />
    </div>
  );
};

export default CommunityPage;
