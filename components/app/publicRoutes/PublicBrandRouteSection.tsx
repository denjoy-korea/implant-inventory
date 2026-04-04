import React from 'react';
import type {
  PlanType,
  User,
  View,
} from '../../../types';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';

const HomepagePage = lazyWithRetry(() => import('../../HomepagePage'));
const AboutPage = lazyWithRetry(() => import('../../AboutPage'));
const ConsultingPage = lazyWithRetry(() => import('../../ConsultingPage'));
const SolutionsPage = lazyWithRetry(() => import('../../SolutionsPage'));
const CoursesPage = lazyWithRetry(() => import('../../CoursesPage'));
const BlogPage = lazyWithRetry(() => import('../../BlogPage'));
const CommunityPage = lazyWithRetry(() => import('../../CommunityPage'));

interface PublicBrandRouteSectionProps {
  currentView: View;
  user: User | null;
  isSystemAdmin: boolean;
  onGoToDenjoyLogin: () => void;
  onGoToDenjoySignup: (plan?: PlanType) => void;
  onHandleNavigate: (view: View) => void;
  onNavigate: (view: View) => void;
  onNavigateToCourse: (slug: string) => void;
  onLogout: () => void | Promise<void>;
}

const PublicBrandRouteSection: React.FC<PublicBrandRouteSectionProps> = ({
  currentView,
  user,
  isSystemAdmin,
  onGoToDenjoyLogin,
  onGoToDenjoySignup,
  onHandleNavigate,
  onNavigate,
  onNavigateToCourse,
  onLogout,
}) => {
  const sharedBrandPageProps = {
    user,
    onGoToLogin: onGoToDenjoyLogin,
    onGoToSignup: () => onGoToDenjoySignup(),
    onGoToContact: () => onHandleNavigate('contact'),
    onNavigate: (view: string) => onHandleNavigate(view as View),
    onGoToTerms: () => onHandleNavigate('terms'),
    onGoToPrivacy: () => onHandleNavigate('privacy'),
    onGoToMyPage: () => onNavigate('mypage'),
    onGoToAdminPanel: isSystemAdmin ? () => onHandleNavigate('admin_panel') : undefined,
    onLogout: user ? onLogout : undefined,
  };

  if (currentView === 'homepage') {
    return (
      <HomepagePage
        user={user}
        onGoToLogin={onGoToDenjoyLogin}
        onGoToSignup={() => onGoToDenjoySignup()}
        onGoToContact={() => onHandleNavigate('contact')}
        onGoToFeaturedCourse={() => onNavigateToCourse('implant-inventory')}
        onOpenInventorySolution={() => onHandleNavigate('landing')}
        onGoToTerms={() => onHandleNavigate('terms')}
        onGoToPrivacy={() => onHandleNavigate('privacy')}
        onNavigate={(view) => onHandleNavigate(view as View)}
        onGoToMyPage={() => onNavigate('mypage')}
        onGoToAdminPanel={isSystemAdmin ? () => onHandleNavigate('admin_panel') : undefined}
        onLogout={user ? onLogout : undefined}
      />
    );
  }

  if (currentView === 'about') {
    return <AboutPage {...sharedBrandPageProps} />;
  }

  if (currentView === 'consulting') {
    return <ConsultingPage {...sharedBrandPageProps} />;
  }

  if (currentView === 'solutions') {
    return <SolutionsPage {...sharedBrandPageProps} />;
  }

  if (currentView === 'courses') {
    return <CoursesPage {...sharedBrandPageProps} />;
  }

  if (currentView === 'blog') {
    return <BlogPage {...sharedBrandPageProps} />;
  }

  if (currentView === 'community') {
    return <CommunityPage {...sharedBrandPageProps} />;
  }

  return null;
};

export default PublicBrandRouteSection;
