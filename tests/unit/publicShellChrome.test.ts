import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it, vi } from 'vitest';
import PublicShellChrome from '@/components/app/PublicShellChrome';

function renderPublicShellChrome(
  overrides: Partial<React.ComponentProps<typeof PublicShellChrome>> = {},
) {
  const helmetContext: {
    helmet?: {
      title: { toString: () => string };
      meta: { toString: () => string };
    };
  } = {};

  const html = renderToStaticMarkup(
    React.createElement(
      HelmetProvider,
      { context: helmetContext as never },
      React.createElement(
        PublicShellChrome,
        {
          currentView: 'pricing',
          user: null,
          isSystemAdmin: false,
          isBrandPage: false,
          isServiceHubPage: false,
          usesHomepageHeader: false,
          hasPublicMobileBottomOffset: true,
          meta: {
            title: '요금제 | DenJOY',
            description: '테스트 설명',
          },
          downgradePending: null,
          downgradeDiff: null,
          downgradeCreditMsg: undefined,
          memberSelectPending: null,
          planState: null,
          suspenseFallback: React.createElement('div', null, 'loading'),
          onNavigate: vi.fn(),
          onTabNavigate: vi.fn(),
          onProfileClick: vi.fn(),
          onLogout: vi.fn(),
          onGoToDenjoyLogin: vi.fn(),
          onGoToDenjoySignup: vi.fn(),
          onAnalyzeEntry: vi.fn(),
          confirmDowngrade: vi.fn(async () => undefined),
          confirmMemberSelection: vi.fn(async () => undefined),
          setDowngradePending: vi.fn(),
          setMemberSelectPending: vi.fn(),
          children: React.createElement('section', null, '공개 셸 본문'),
          ...overrides,
        },
      ),
    ),
  );

  return { html, helmetContext };
}

describe('PublicShellChrome', () => {
  it('비브랜드 공개 뷰에서는 표준 헤더와 본문을 함께 렌더한다', () => {
    const { html, helmetContext } = renderPublicShellChrome();

    expect(html).toContain('메인홈');
    expect(html).toContain('재고관리');
    expect(html).toContain('공개 셸 본문');
    expect(html).toContain('pb-36 xl:pb-0');
    expect(helmetContext.helmet?.title.toString()).toContain('요금제 | DenJOY');
    expect(helmetContext.helmet?.meta.toString()).toContain('테스트 설명');
  });

  it('브랜드 셸에서는 표준 헤더를 생략하고 본문만 유지한다', () => {
    const { html } = renderPublicShellChrome({
      currentView: 'homepage',
      isBrandPage: true,
      hasPublicMobileBottomOffset: false,
      meta: {
        title: '브랜드 홈 | DenJOY',
        description: '브랜드 설명',
      },
    });

    expect(html).toContain('공개 셸 본문');
    expect(html).not.toContain('메인홈');
    expect(html).not.toContain('재고관리');
    expect(html).not.toContain('pb-36 xl:pb-0');
  });
});
