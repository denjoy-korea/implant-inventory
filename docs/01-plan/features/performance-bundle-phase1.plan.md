# Plan: performance-bundle-phase1

## 1. Overview

| Item | Value |
|------|-------|
| Feature | performance-bundle-phase1 |
| Priority | High |
| Scope | 대형 엔트리 청크 분리 + 라우트 단위 lazy 확대 |
| Focus Files | `vite.config.ts`, `App.tsx` |
| Created | 2026-02-22 |

목표는 기능/UX 변경 없이 초기 로드 비용을 줄이고, 배포 시 번들 경고를 해소하는 것입니다.

---

## 2. Baseline (현재 상태)

`npm run build` 기준 핵심 수치:

- `dist/assets/index-*.js`: **677.33 kB** (gzip 218.40 kB)
- `dist/assets/DashboardGuardedContent-*.js`: **351.93 kB**
- `dist/assets/supabase-*.js`: **173.03 kB**
- Vite 경고: `Some chunks are larger than 500 kB after minification`

현재 구조 근거:

- `vite.config.ts`는 `vendor/supabase` 2개 수동 청크만 정의
- `App.tsx`는 일부 라우트 lazy만 적용 (`DashboardGuardedContent`, `AppPublicRouteSection`, `SystemAdminDashboard`, `AppUserOverlayStack`)
- `App.tsx`에 대시보드 전용 서비스/유틸 import가 다수 정적 로딩되어 엔트리 청크 비대화 가능성 높음

---

## 3. 목표 (Phase 1)

### 성능 목표

1. 엔트리 청크(`index-*.js`)를 **500 kB 미만**으로 낮춘다.
2. 첫 진입 시 비필수 코드(대시보드/엑셀 파싱)를 지연 로딩한다.
3. 빌드 경고(`>500 kB`)를 제거하거나 경고 원인을 명확히 축소한다.

### 품질 목표

1. 기능 동작/UX 변화 없음.
2. `npm run typecheck`, `npm run test`, `npm run build` 통과.
3. 퍼널/운영 핵심 흐름(로그인, 대시보드 진입, 엑셀 업로드, 주문/FAIL, Contact/Analyze) 회귀 없음.

---

## 4. Scope

### In Scope

- `vite.config.ts`
  - 수동 청크 정책을 2개(vendor/supabase)에서 기능군 단위로 확장
  - `manualChunks`를 함수 기반으로 전환해 경로 기반 분리
- `App.tsx`
  - 대시보드 전용 코드의 정적 import 축소
  - 라우트 단위 lazy 경계 확대
  - 엑셀 관련 무거운 경로를 이벤트 시점 동적 import로 전환

### Out of Scope

- UI/디자인 변경
- 상태관리 아키텍처 전면 교체(Context/useReducer 도입 등)
- 대형 컴포넌트 구조 리팩터링 전면 수행
- 신규 라이브러리 도입

---

## 5. 실행 전략

### 5.1 `vite.config.ts` 전략 (청크 정책)

`build.rollupOptions.output.manualChunks`를 함수형으로 바꿔 아래 그룹을 분리:

- `react-core`: `react`, `react-dom`
- `supabase-core`: `@supabase/supabase-js`
- `xlsx-core`: `xlsx` 및 excel parsing 관련 경로
- `admin-route`: 시스템 관리자 관련 컴포넌트
- `dashboard-route`: 대시보드 작업 영역(재고/수술/주문/FAIL) 관련 경로
- `public-route`: 랜딩/가치/가격/문의/분석 퍼블릭 영역

핵심 원칙:

- 청크 명은 기능 경계를 반영하고, 변경이 잦은 영역과 안정 영역을 분리
- 너무 미세한 분할은 피하고(요청 폭증 방지), 라우트 전환 단위로 분리

### 5.2 `App.tsx` 전략 (라우트 lazy 확대)

1. **대시보드 전용 import 지연화**
   - 퍼블릭 경로에서 필요 없는 대시보드 전용 의존성(서비스/유틸/UI)을 정적 import에서 분리
   - 조건부 경로 또는 이벤트 핸들러에서 `await import(...)` 적용

2. **엑셀 경로 지연화**
   - `parseExcelFile`, `downloadExcelFile` 경로를 업로드/다운로드 실행 시점 동적 import로 전환
   - `xlsx`가 초기 엔트리에 섞이지 않게 하여 초기 JS 감소 유도

3. **Suspense 경계 유지/확대**
   - 기존 `Suspense` fallback 패턴은 유지
   - lazy 전환된 경계에 동일 fallback 정책 적용해 UX 회귀 방지

### 5.3 라우트 단위 확장 우선순위

1. 퍼블릭 진입에 불필요한 대시보드 전용 코드 분리
2. 엑셀 처리 경로 분리 (`xlsx` 관련)
3. 관리자/운영 탭 코드의 독립 청크화 강화

---

## 6. 단계별 작업 순서

### Step A (빠른 효과)

- `vite.config.ts`의 manualChunks 함수화
- 빌드 후 청크 크기 비교표 작성

### Step B (엔트리 절감 핵심)

- `App.tsx`의 정적 import 중 대시보드 전용/엑셀 전용 경로를 동적 import로 이전
- `Suspense` 경계에서 로딩 UX 유지

### Step C (검증 및 안정화)

- 타입/테스트/빌드 통과 확인
- 핵심 사용자 흐름 수동 점검
- 청크 변화 재측정 및 목표 달성 여부 기록

---

## 7. 검증 계획

### 7.1 정량 검증

```bash
npm run build
```

비교 항목:

- `index-*.js` 크기 (목표: < 500 kB)
- 상위 5개 청크 크기
- `Some chunks are larger than 500 kB` 경고 발생 여부

### 7.2 회귀 검증

```bash
npm run typecheck
npm run test
npm run build
```

핵심 수동 시나리오:

- 랜딩 -> 가격 -> 가입/로그인
- 대시보드 진입 후 주요 탭 이동
- 엑셀 업로드/다운로드
- Contact/Analyze 제출

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 과도한 청크 분리로 요청 수 증가 | 초기 라우트 전환 지연 | 기능군 단위로만 분리, 미세 분할 금지 |
| 동적 import 타이밍 오류 | 런타임 에러 | 에러 경계 + 기존 fallback 유지 |
| 엑셀 경로 분리 시 업로드 흐름 불안정 | 핵심 기능 회귀 | 업로드/다운로드 시나리오 우선 회귀 테스트 |

---

## 9. 완료 기준 (Definition of Done)

- [ ] `vite.config.ts` 청크 정책이 기능군 단위로 확장됨
- [ ] `App.tsx`에서 대시보드/엑셀 경로 lazy 범위가 확대됨
- [ ] `index-*.js` 500 kB 미만 또는 감소 폭/잔여 원인 문서화
- [ ] `typecheck/test/build` 모두 통과
- [ ] 핵심 사용자 플로우 회귀 없음
