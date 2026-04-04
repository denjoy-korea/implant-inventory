import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { ExcelRow, User } from '@/types';

type HookResult = ReturnType<typeof useOnboarding>;

function createStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function renderUseOnboarding(params: Parameters<typeof useOnboarding>[0]): HookResult {
  let snapshot: HookResult | null = null;

  function Probe() {
    snapshot = useOnboarding(params);
    return React.createElement('div');
  }

  renderToStaticMarkup(React.createElement(Probe));

  if (!snapshot) {
    throw new Error('useOnboarding did not render');
  }

  return snapshot;
}

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'user@example.com',
  name: '테스트 사용자',
  role: 'master',
  hospitalId: 'hospital-1',
  status: 'active',
  creditBalance: 0,
  ...overrides,
});

const baseParams = {
  isLoading: false,
  currentView: 'dashboard',
  dashboardTab: 'overview' as const,
  inventoryLength: 0,
  surgeryMaster: {} as Record<string, ExcelRow[]>,
  requiresBillingProgramSetup: false,
  planState: null,
};

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  it('hospitalId 없는 계정에는 온보딩을 표시하지 않는다', () => {
    const result = renderUseOnboarding({
      ...baseParams,
      user: makeUser({ hospitalId: '' }),
    });

    expect(result.firstIncompleteStep).toBeNull();
    expect(result.onboardingStep).toBeNull();
    expect(result.shouldShowOnboarding).toBe(false);
    expect(result.showOnboardingToast).toBe(false);
  });

  it('병원 계정에는 기존대로 첫 미완료 단계 온보딩을 표시한다', () => {
    const result = renderUseOnboarding({
      ...baseParams,
      user: makeUser(),
    });

    expect(result.firstIncompleteStep).toBe(1);
    expect(result.onboardingStep).toBe(1);
    expect(result.shouldShowOnboarding).toBe(true);
  });
});
