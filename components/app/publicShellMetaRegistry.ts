import { getCourseDetailContent } from '../../data/courseCatalogContent';
import type { View } from '../../types';
import type { PublicShellMeta } from './publicShellTypes';

export const PUBLIC_SHELL_PAGE_META: Record<string, PublicShellMeta> = {
  landing: {
    title: '임플란트 재고관리 | DenJOY',
    description: '매주 2시간 엑셀 정리를 5분으로. 덴트웹 데이터 업로드만으로 실시간 재고 추적, 스마트 발주, 수술기록 자동 연동.',
  },
  homepage: {
    title: 'DenJOY | 치과 교육 · 컨설팅 · 솔루션',
    description: 'DenJOY 메인 홈페이지에서 교육, 컨설팅, 솔루션 구조를 한 번에 보고 각 솔루션 랜딩으로 이동하세요.',
  },
  about: {
    title: '회사소개 | DenJOY',
    description: 'DenJOY 팀이 어떤 방식으로 치과의 교육, 운영, 솔루션 문제를 다루는지 소개합니다.',
  },
  consulting: {
    title: '병원컨설팅 | DenJOY',
    description: '치과 운영 구조와 데이터 흐름을 함께 정리하는 DenJOY 병원컨설팅을 소개합니다.',
  },
  solutions: {
    title: '솔루션 | DenJOY',
    description: 'DenJOY가 제공하는 병원 운영 솔루션과 도입 방향을 확인하세요.',
  },
  courses: {
    title: '강의 | DenJOY',
    description: 'DenJOY 강의 주제와 시즌 운영 구조를 확인하고 상세페이지로 이동하세요.',
  },
  blog: {
    title: '블로그 | DenJOY',
    description: '치과 운영과 데이터 실무에 관한 DenJOY 인사이트를 읽어보세요.',
  },
  community: {
    title: '커뮤니티 | DenJOY',
    description: 'DenJOY 커뮤니티 소식과 참여 정보를 확인하세요.',
  },
  value: {
    title: '도입효과 | DenJOY',
    description: '연 104시간 절약, 발주 실수 감소, 비용 누수 방지. DenJOY 도입 전후 변화를 확인하세요.',
  },
  pricing: {
    title: '요금제 | DenJOY',
    description: 'Free부터 Business까지, 병원 규모에 맞는 요금제. 무료 플랜으로 바로 시작하세요.',
  },
  reviews: {
    title: '고객후기 | DenJOY',
    description: '치과 원장, 실장, 스탭이 직접 남긴 DenJOY 사용 후기를 확인하세요.',
  },
  notices: {
    title: '업데이트 소식 | DenJOY',
    description: 'DenJOY 서비스의 새로운 기능과 개선 사항을 확인하세요.',
  },
  contact: {
    title: '문의하기 | DenJOY',
    description: '도입 상담, 요금제 안내, 맞춤 기능 문의. DenJOY 팀에 편하게 연락하세요.',
  },
  analyze: {
    title: '무료 분석 | DenJOY',
    description: '덴트웹 수술기록을 업로드하면 재고 건강도를 무료로 분석해 드립니다.',
  },
  terms: {
    title: '이용약관 | DenJOY',
    description: 'DenJOY 서비스 이용약관을 확인하세요.',
  },
  privacy: {
    title: '개인정보처리방침 | DenJOY',
    description: 'DenJOY 개인정보처리방침을 확인하세요.',
  },
  login: {
    title: '로그인 | DenJOY',
    description: 'DenJOY 계정에 로그인하세요.',
  },
  signup: {
    title: '회원가입 | DenJOY',
    description: '간편한 가입 후 무료로 시작하세요. 카드 정보 불필요.',
  },
  mypage: {
    title: '마이페이지 | DenJOY',
    description: '내 서비스와 계정 설정, 워크스페이스 진입을 한 곳에서 관리하세요.',
  },
  admin_panel: {
    title: '관리자 페이지 | DenJOY',
    description: '서비스 관리자 전용 운영 페이지에서 회원, 결제, 강의를 관리하세요.',
  },
};

export function getCourseMetaFromPath(): PublicShellMeta | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/courses\/([^/]+)\/?$/);
  if (!match) return null;

  const content = getCourseDetailContent(match[1]);
  if (!content) {
    return {
      title: '강의 상세 | DenJOY',
      description: 'DenJOY 강의 상세 페이지입니다.',
    };
  }

  return {
    title: `${content.title} | DenJOY 강의`,
    description: content.shortDescription,
  };
}

export function getPublicShellMeta(currentView: View): PublicShellMeta {
  return currentView === 'courses'
    ? (getCourseMetaFromPath() || PUBLIC_SHELL_PAGE_META.courses || PUBLIC_SHELL_PAGE_META.landing)
    : (PUBLIC_SHELL_PAGE_META[currentView] || PUBLIC_SHELL_PAGE_META.landing);
}
