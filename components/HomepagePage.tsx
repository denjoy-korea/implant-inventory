import React from 'react';
import HomepageHeader from './home/HomepageHeader';
import HomepageFooter from './home/HomepageFooter';
import { User } from '../types';
import HeroSection from './home/HeroSection';
import PainPointsSection from './home/PainPointsSection';
import StatsSection from './home/StatsSection';
import FourPillarsSection from './home/FourPillarsSection';
import SolutionShowcaseSection from './home/SolutionShowcaseSection';
import CoursesPreviewSection from './home/CoursesPreviewSection';
import SocialProofSection from './home/SocialProofSection';
import FounderSection from './home/FounderSection';
import MicroCommitmentSection from './home/MicroCommitmentSection';
import CTASection from './home/CTASection';

interface HomepagePageProps {
  user?: User | null;
  onGoToLogin: () => void;
  onGoToSignup: () => void;
  onGoToContact: () => void;
  onGoToFeaturedCourse: () => void;
  onOpenInventorySolution: () => void;
  onGoToTerms: () => void;
  onGoToPrivacy: () => void;
  onNavigate: (view: string) => void;
  onGoToMyPage?: () => void;
  onGoToAdminPanel?: () => void;
  onLogout?: () => void | Promise<void>;
}

const HomepagePage: React.FC<HomepagePageProps> = ({
  user,
  onGoToLogin,
  onGoToSignup,
  onGoToContact,
  onGoToFeaturedCourse,
  onOpenInventorySolution,
  onGoToTerms,
  onGoToPrivacy,
  onNavigate,
  onGoToMyPage,
  onGoToAdminPanel,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-mesh text-slate-900 overflow-x-hidden">
      <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-pulse-glow" aria-hidden="true" />
      <div className="orb orb-blue w-[500px] h-[500px] top-1/3 -right-40 animate-pulse-glow" aria-hidden="true" style={{ animationDelay: '1s' }} />

      <HomepageHeader
        currentView="homepage"
        user={user}
        onGoToLogin={onGoToLogin}
        onGoToSignup={onGoToSignup}
        onGoToContact={onGoToContact}
        onNavigate={onNavigate}
        onGoToMyPage={onGoToMyPage}
        onGoToAdminPanel={onGoToAdminPanel}
        onLogout={onLogout}
      />

      <main className="relative z-10 overflow-x-hidden pt-20">
        <HeroSection
          onGoToContact={onGoToContact}
          onOpenInventorySolution={onOpenInventorySolution}
          onGoToAbout={() => onNavigate('about')}
        />
        <PainPointsSection />
        <StatsSection />
        <FourPillarsSection
          onGoToContact={onGoToContact}
          onOpenInventorySolution={onOpenInventorySolution}
        />
        <SolutionShowcaseSection
          onOpenInventorySolution={onOpenInventorySolution}
          onGoToContact={onGoToContact}
          onNavigate={onNavigate}
        />
        <CoursesPreviewSection
          onGoToContact={onGoToContact}
          onGoToFeaturedCourse={onGoToFeaturedCourse}
        />
        <SocialProofSection />
        <FounderSection onGoToContact={onGoToContact} />
        <MicroCommitmentSection
          onGoToContact={onGoToContact}
          onOpenInventorySolution={onOpenInventorySolution}
        />
        <CTASection
          onGoToContact={onGoToContact}
          onOpenInventorySolution={onOpenInventorySolution}
        />
      </main>

      <HomepageFooter
        onGoToContact={onGoToContact}
        onGoToTerms={onGoToTerms}
        onGoToPrivacy={onGoToPrivacy}
      />
    </div>
  );
};

export default HomepagePage;
