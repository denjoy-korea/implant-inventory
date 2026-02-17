# Plan: Vercel 배포 준비

## Feature Overview

| Item | Detail |
|------|--------|
| Feature Name | vercel-deployment |
| Level | Dynamic |
| Priority | HIGH |
| PDCA Phase | Plan |
| Reference Skills | vercel-react-best-practices, vercel-composition-patterns |

## Problem Statement

현재 프로젝트는 개발 완료 상태이지만, 프로덕션 배포를 위한 준비가 되어있지 않음:

1. **CDN 의존성 문제** (CRITICAL): `index.html`에 CDN으로 로딩하는 리소스가 프로덕션 빌드에 그대로 포함됨
   - `cdn.tailwindcss.com` — 런타임 JIT 컴파일 (~300KB+, 프로덕션 사용 금지)
   - `cdn.jsdelivr.net/npm/xlsx` — npm에 이미 설치되어 있어 이중 로딩
   - `esm.sh` React import map — Vite가 번들링한 React와 충돌 가능

2. **Tailwind CSS 빌드 파이프라인 부재**: `tailwindcss`, `postcss`, `autoprefixer` 미설치, 설정 파일 없음

3. **SEO/메타 정보 부재**: favicon, OG 태그, description 없음

4. **Error Boundary 없음**: React.lazy 실패 시 전체 앱 크래시

5. **Vercel 배포 설정 없음**: vercel.json, SPA 리다이렉트 미설정

## Goals

- [ ] CDN 의존성 완전 제거, 모든 의존성을 Vite 빌드에 통합
- [ ] Tailwind CSS v4 빌드 파이프라인 구성
- [ ] 프로덕션 index.html 최적화 (SEO, 폰트, favicon)
- [ ] Error Boundary 추가
- [ ] Vercel 배포 설정 및 환경변수 구성
- [ ] 최종 빌드 검증 (번들 크기, 0 에러)

## Implementation Tasks

### Task 1: Tailwind CSS v4 빌드 파이프라인 구성 (CRITICAL)

**Why**: CDN Tailwind은 프로덕션 사용 금지. 로컬 빌드로 전환해야 함.

**Actions**:
1. `npm install -D tailwindcss @tailwindcss/vite` 설치
2. `vite.config.ts`에 `@tailwindcss/vite` 플러그인 추가
3. `index.css`에서 `@tailwind base/components/utilities` → `@import "tailwindcss"` 전환
4. `tailwind.config.ts` 생성 (content 경로, theme extend)
5. CDN `<script src="cdn.tailwindcss.com">` 제거
6. 빌드 후 Tailwind 클래스가 정상 적용되는지 확인

**Vercel Best Practice**: `bundle-defer-third-party` — CDN 런타임 의존성 제거

### Task 2: index.html 정리 (CRITICAL)

**Why**: 프로덕션 빌드에 불필요한 CDN 스크립트가 포함되어 있음.

**Actions**:
1. `<script src="cdn.jsdelivr.net/npm/xlsx">` 제거 (이미 npm 번들링됨)
2. `<script type="importmap">` React esm.sh 매핑 제거 (Vite가 번들링)
3. Google Fonts `<link>`에 `preconnect` + `display=swap` 최적화
4. `<meta name="description">` 추가
5. `<meta property="og:title/description/image">` OG 태그 추가
6. favicon 추가 (`/favicon.ico`, `/apple-touch-icon.png`)

**Vercel Best Practice**: `bundle-barrel-imports` — 불필요한 외부 로딩 제거

### Task 3: Error Boundary 추가 (HIGH)

**Why**: React.lazy 19개 컴포넌트 중 하나라도 로딩 실패 시 전체 앱 크래시.

**Actions**:
1. `components/ErrorBoundary.tsx` 생성
2. App.tsx의 `<Suspense>` 래퍼에 ErrorBoundary 추가
3. 에러 발생 시 재시도 버튼 UI 제공

**Vercel Best Practice**: `async-suspense-boundaries` — Suspense와 ErrorBoundary 조합

### Task 4: Vercel 배포 설정 (HIGH)

**Why**: SPA 라우팅 지원 및 환경변수 구성 필요.

**Actions**:
1. `vercel.json` 생성:
   - SPA rewrites: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
   - 캐시 헤더: assets에 immutable 캐시
   - Security 헤더: X-Frame-Options, X-Content-Type-Options
2. `.env.example` 업데이트 (VITE_ 접두사 환경변수 목록)
3. `.gitignore` 확인 (.env.local 포함 여부)

### Task 5: 폰트 최적화 (MEDIUM)

**Why**: Google Fonts는 render-blocking. 최적화 필요.

**Actions**:
1. `preconnect` 힌트 추가: `<link rel="preconnect" href="https://fonts.googleapis.com">`
2. `display=swap` 확인 (이미 있음 ✅)
3. `body` 폰트 스타일을 index.css로 이동 (인라인 `<style>` 제거)

**Vercel Best Practice**: `bundle-preload` — 폰트 사전 로딩

### Task 6: 최종 빌드 검증 (HIGH)

**Actions**:
1. `npm run build` — 0 에러 확인
2. 번들 크기 비교 (CDN 제거 전후)
3. `npm run preview`로 로컬 프로덕션 테스트
4. Tailwind 클래스 렌더링 확인
5. Hash 라우팅 동작 확인
6. Lazy 로딩 정상 동작 확인

## Vercel Best Practices Checklist

| Rule | Status | Description |
|------|--------|-------------|
| `bundle-dynamic-imports` | ✅ Done | 19 React.lazy 컴포넌트 |
| `bundle-defer-third-party` | ❌ Fix | CDN Tailwind/xlsx/React 제거 |
| `rendering-content-visibility` | ✅ Done | 테이블 최적화 |
| `async-suspense-boundaries` | ⚠️ Partial | Suspense 있으나 ErrorBoundary 없음 |
| `bundle-preload` | ⚠️ Partial | Vite modulepreload 있으나 폰트 최적화 필요 |
| `rerender-derived-state` | ✅ Done | 렌더링 중 파생 상태 계산 |
| `rendering-conditional-render` | ✅ OK | 삼항연산자 사용 |

## Composition Patterns Checklist

| Rule | Status | Description |
|------|--------|-------------|
| `react19-no-forwardref` | ✅ OK | forwardRef 미사용 |
| `architecture-avoid-boolean-props` | ⚠️ Info | App.tsx 1410줄 모놀리식이지만 현재 단계에서 리팩토링 범위 아님 |

## Acceptance Criteria

1. `npm run build` 성공, 0 에러
2. CDN 스크립트 0개 (tailwind, xlsx, importmap 모두 제거)
3. Tailwind 클래스가 빌드된 CSS에 포함
4. `vercel.json` 존재, SPA rewrite 설정
5. Error Boundary가 lazy 컴포넌트를 감싸고 있음
6. SEO 메타태그 포함 (title, description, OG)
7. `npm run preview`에서 정상 동작

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tailwind v4 마이그레이션 실패 | HIGH | v4 문법 확인, 기존 클래스 호환성 테스트 |
| CDN 제거 후 스타일 깨짐 | HIGH | 빌드 후 주요 페이지 시각적 확인 |
| xlsx CDN 제거 후 엑셀 기능 장애 | MEDIUM | npm 번들 버전으로 이미 동작 중 확인 |

## Estimated Scope

| Item | Count |
|------|-------|
| New Files | 3 (vercel.json, ErrorBoundary.tsx, favicon) |
| Modified Files | 4 (index.html, index.css, vite.config.ts, App.tsx) |
| Packages to Install | 2 (tailwindcss, @tailwindcss/vite) |
| Packages to Remove | 0 |
