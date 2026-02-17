# Design: Vercel 배포 준비

## Feature Overview

| Item | Detail |
|------|--------|
| Feature Name | vercel-deployment |
| Plan Reference | `docs/01-plan/features/vercel-deployment.plan.md` |
| PDCA Phase | Design |
| Reference Skills | vercel-react-best-practices, vercel-composition-patterns |

---

## 1. Implementation Order

```
Step 1: Tailwind CSS v4 설치 및 Vite 플러그인 구성
Step 2: index.css 마이그레이션 (@tailwind → @import)
Step 3: index.html CDN 정리 (tailwind, xlsx, importmap 제거)
Step 4: index.html SEO 메타태그 추가
Step 5: ErrorBoundary 컴포넌트 생성
Step 6: App.tsx에 ErrorBoundary 적용
Step 7: vercel.json 생성
Step 8: 빌드 검증 및 프리뷰 테스트
```

---

## 2. File Changes Specification

### 2.1 Tailwind CSS v4 + Vite Plugin

#### 2.1.1 Package Installation

```bash
npm install tailwindcss @tailwindcss/vite
```

- `tailwindcss` v4: CSS-first 설정, zero-config 콘텐츠 감지
- `@tailwindcss/vite`: Vite 네이티브 플러그인 (PostCSS 불필요)
- `tailwind.config.js` 불필요 (v4는 CSS-first, `@theme`으로 설정)

#### 2.1.2 vite.config.ts 수정

```typescript
// 변경 전
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      // ...
    };
});

// 변경 후
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [tailwindcss(), react()],
      // ...
    };
});
```

**규칙**: `tailwindcss()`를 `react()` 앞에 배치 (CSS 처리 순서)

#### 2.1.3 index.css 수정

```css
/* 변경 전 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  /* ... */
}

/* 변경 후 */
@import "tailwindcss";

@layer utilities {
  /* ... */
}
```

- `@tailwind base/components/utilities` 3줄 → `@import "tailwindcss"` 1줄
- `@layer utilities` 블록 및 커스텀 CSS는 그대로 유지
- `@keyframes`, `.glass`, `.notice-content` 등 커스텀 스타일 유지

### 2.2 index.html 정리

#### 2.2.1 제거할 항목 (3개)

```html
<!-- 제거 1: CDN Tailwind (CRITICAL) -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- 제거 2: CDN xlsx (이미 npm 번들링됨) -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

<!-- 제거 3: React import map (Vite가 번들링) -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.2.3",
    "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
    "react/": "https://esm.sh/react@^19.2.3/"
  }
}
</script>
```

#### 2.2.2 추가/수정할 항목

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>임플란트 재고관리 Pro | DentWeb</title>
    <meta name="description" content="치과 임플란트 재고관리 시스템. 엑셀 업로드, 실시간 재고 추적, 수술 기록, 주문 관리를 한 곳에서.">

    <!-- Open Graph -->
    <meta property="og:title" content="임플란트 재고관리 Pro">
    <meta property="og:description" content="치과 임플란트 재고관리 시스템. 엑셀 업로드, 실시간 재고 추적, 수술 기록, 주문 관리.">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="ko_KR">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">

    <!-- Google Fonts (최적화) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="/index.css">
</head>
<body class="bg-slate-50 text-slate-900">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
</body>
</html>
```

**변경 사항**:
- CDN 스크립트 3개 제거
- `<title>` 업데이트 (브랜딩 추가)
- `<meta name="description">` 추가
- OG 태그 추가
- `<link rel="icon">` favicon 추가
- Google Fonts `preconnect` 2개 추가
- 인라인 `<style>` 제거 (body 폰트 → index.css로 이동)

#### 2.2.3 index.css에 body 폰트 추가

```css
@import "tailwindcss";

/* Body font (moved from inline <style>) */
body {
  font-family: 'Inter', 'Noto Sans KR', sans-serif;
}
```

### 2.3 favicon.svg 생성

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#4f46e5"/>
  <text x="16" y="23" text-anchor="middle" fill="white"
        font-family="Inter, sans-serif" font-weight="700" font-size="18">D</text>
</svg>
```

경로: `public/favicon.svg`

### 2.4 ErrorBoundary 컴포넌트

#### 2.4.1 components/ErrorBoundary.tsx

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0
                    2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464
                    0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            페이지를 불러오지 못했습니다
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            네트워크 연결을 확인하고 다시 시도해 주세요.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### 2.4.2 App.tsx에 ErrorBoundary 적용

```typescript
// 추가 import
import ErrorBoundary from './components/ErrorBoundary';

// Suspense를 감싸는 위치 (4곳)

// 1. 비-대시보드 콘텐츠 (line ~836)
<ErrorBoundary>
  <Suspense fallback={suspenseFallback}>
    {/* LandingPage, AuthForm, PricingPage, etc. */}
  </Suspense>
</ErrorBoundary>

// 2. 대시보드 메인 콘텐츠 (line ~1042)
<ErrorBoundary>
  <Suspense fallback={suspenseFallback}>
    {/* DashboardOverview, InventoryManager, etc. */}
  </Suspense>
</ErrorBoundary>

// 3. SystemAdminDashboard (line ~1260)
<ErrorBoundary>
  <Suspense fallback={suspenseFallback}>
    <SystemAdminDashboard ... />
  </Suspense>
</ErrorBoundary>

// 4. UserProfile 모달 (line ~1348)
<ErrorBoundary>
  <Suspense fallback={null}>
    <UserProfile ... />
  </Suspense>
</ErrorBoundary>
```

**Vercel Best Practice**: `async-suspense-boundaries` — 각 Suspense boundary에 Error Boundary 쌍

### 2.5 vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

**설명**:
- `rewrites`: SPA hash 라우팅 지원 (모든 경로 → index.html)
- `assets/` 경로: Vite 해시 파일명이므로 1년 immutable 캐시
- Security headers: OWASP 권장

### 2.6 .env.example 업데이트

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI (Optional)
GEMINI_API_KEY=your-gemini-key
```

---

## 3. Vercel Best Practices 적용 명세

| Rule ID | Rule Name | Applicable | Implementation |
|---------|-----------|:----------:|----------------|
| `bundle-defer-third-party` | CDN 런타임 의존성 제거 | ✅ | CDN tailwind/xlsx/importmap 제거 |
| `bundle-dynamic-imports` | lazy 로딩 | ✅ Done | 19 React.lazy 컴포넌트 |
| `bundle-preload` | 리소스 프리로드 | ✅ | 폰트 preconnect, Vite modulepreload |
| `async-suspense-boundaries` | Suspense + ErrorBoundary | ✅ | 4개 Suspense에 ErrorBoundary 쌍 |
| `rendering-content-visibility` | 테이블 최적화 | ✅ Done | CSS content-visibility |
| `rendering-conditional-render` | 삼항연산자 조건부 렌더 | ✅ Done | App.tsx 전반 |
| `rerender-derived-state` | 렌더링 중 파생 상태 | ✅ Done | effectivePlan, isReadOnly 등 |
| `react19-no-forwardref` | forwardRef 미사용 | ✅ Done | 해당 없음 |

---

## 4. File Inventory

### New Files (3)

| File | Purpose |
|------|---------|
| `public/favicon.svg` | SVG favicon (indigo D 로고) |
| `components/ErrorBoundary.tsx` | React Error Boundary with retry |
| `vercel.json` | Vercel 배포 설정 (SPA rewrite, 캐시, 보안 헤더) |

### Modified Files (4)

| File | Changes |
|------|---------|
| `vite.config.ts` | `@tailwindcss/vite` 플러그인 추가 |
| `index.css` | `@tailwind` → `@import "tailwindcss"`, body font 추가 |
| `index.html` | CDN 3개 제거, SEO 메타태그, preconnect, favicon |
| `App.tsx` | ErrorBoundary import + 4개 Suspense 래핑 |

### Packages

| Package | Action | Purpose |
|---------|--------|---------|
| `tailwindcss` | Install (devDep) | Tailwind CSS v4 엔진 |
| `@tailwindcss/vite` | Install (devDep) | Vite 네이티브 플러그인 |

---

## 5. Build Verification Criteria

| # | Check | Expected |
|---|-------|----------|
| 1 | `npm run build` | 0 에러, 0 경고 |
| 2 | CDN 스크립트 | `dist/index.html`에 외부 CDN 0개 |
| 3 | CSS 번들 크기 | 빌드 CSS에 Tailwind 유틸리티 포함 (> 10KB) |
| 4 | JS 번들 | 초기 JS < 350KB (이전: 317KB + CDN ~500KB) |
| 5 | TypeScript | `tsc --noEmit` 0 에러 |
| 6 | Tailwind 클래스 | `bg-slate-50`, `text-indigo-600` 등 빌드 CSS에 존재 |
| 7 | ErrorBoundary | import 및 4개 Suspense 래핑 확인 |
| 8 | favicon | `dist/favicon.svg` 존재 |

---

## 6. Implementation Order (Do Phase 가이드)

```
1. npm install tailwindcss @tailwindcss/vite
2. vite.config.ts — tailwindcss() 플러그인 추가
3. index.css — @import "tailwindcss" + body font
4. index.html — CDN 제거 + SEO + preconnect + favicon ref
5. public/favicon.svg — 생성
6. components/ErrorBoundary.tsx — 생성
7. App.tsx — ErrorBoundary import + 4개 Suspense 래핑
8. vercel.json — 생성
9. .env.example — VITE_ 접두사로 업데이트
10. npm run build — 검증
11. npm run preview — 로컬 프로덕션 테스트
```
