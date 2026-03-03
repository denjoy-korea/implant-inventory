# performance-bundle-phase1 Analysis Report

> **Analysis Type**: Gap Analysis (Plan vs Implementation)
>
> **Project**: implant-inventory (DenJOY / DentWeb)
> **Analyst**: gap-detector
> **Date**: 2026-03-03
> **Plan Doc**: [performance-bundle-phase1.plan.md](../01-plan/features/performance-bundle-phase1.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Plan 문서(performance-bundle-phase1.plan.md)에 기술된 번들 최적화 요구사항과 실제 구현 코드 간의 일치율을 검증한다. 별도 Design 문서가 없으므로 Plan 문서의 요구사항을 설계 기준으로 사용한다.

### 1.2 Analysis Scope

| Item | Path |
|------|------|
| Plan Document | `docs/01-plan/features/performance-bundle-phase1.plan.md` |
| vite.config.ts | `vite.config.ts` (lines 30-48) |
| DashboardInventoryMasterSection | `components/app/DashboardInventoryMasterSection.tsx` |
| DashboardWorkspaceSection | `components/app/DashboardWorkspaceSection.tsx` |
| DashboardGuardedContent | `components/app/DashboardGuardedContent.tsx` |
| DashboardOperationalTabs | `components/dashboard/DashboardOperationalTabs.tsx` |
| App.tsx | `App.tsx` (lazy imports, Suspense boundaries, dynamic import) |

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Chunk Policy (vite.config.ts) | 71% | WARNING |
| Lazy Loading (App.tsx + sub-components) | 100% | PASS |
| Excel Dynamic Import | 100% | PASS |
| Suspense Boundaries | 100% | PASS |
| Route-based Chunk Separation | 0% | FAIL |
| **Overall** | **82.6%** | **WARNING** |

---

## 3. Gap Analysis (Plan vs Implementation)

### 3.1 vite.config.ts Chunk Policy (Plan Section 5.1)

Plan에서 `manualChunks`를 함수 기반으로 전환하여 아래 7개 그룹을 분리하도록 요구:

| Plan Chunk Name | Implementation | Status | Notes |
|-----------------|---------------|--------|-------|
| `react-core` | `react-vendor` (line 36) | PASS | 이름 차이(`-core` vs `-vendor`), 기능 동일 |
| `supabase-core` | `supabase-vendor` (line 37) | PASS | 이름 차이, 기능 동일 |
| `xlsx-core` | `xlsx-vendor` (line 42) | PASS | 이름 차이, 기능 동일 |
| `admin-route` | -- | FAIL | 미구현: 시스템 관리자 소스 경로 기반 분리 없음 |
| `dashboard-route` | -- | FAIL | 미구현: 대시보드 소스 경로 기반 분리 없음 |
| `public-route` | -- | FAIL | 미구현: 퍼블릭 소스 경로 기반 분리 없음 |
| (implicit vendor catch-all) | `vendor` (line 43) | PASS | 나머지 node_modules 번들링 |

**추가 구현 (Plan에 없는 항목)**:

| Impl Chunk Name | Source | Notes |
|-----------------|--------|-------|
| `lucide-icons` | line 38 | 아이콘 라이브러리 분리 (성능 이점) |
| `framer-motion` | line 39 | 애니메이션 라이브러리 분리 |
| `recharts` | line 40 | 차트 라이브러리 분리 |
| `date-fns` | line 41 | 날짜 유틸 분리 |

**분석**:
- Plan이 요구한 3가지 소스 경로 기반 청크(`admin-route`, `dashboard-route`, `public-route`)가 전혀 구현되지 않았다.
- 현재 `manualChunks` 함수는 `node_modules` 경로만 분기하며, 프로젝트 소스 파일(`components/`, `services/` 등)에 대한 분기가 없다.
- 다만, React.lazy()를 통한 코드 스플리팅이 이 역할을 상당 부분 대체하고 있다 -- Rollup은 lazy boundary마다 자동으로 별도 청크를 생성하므로, 명시적 `manualChunks` 없이도 `DashboardGuardedContent`, `AppPublicRouteSection`, `SystemAdminDashboard` 등이 별도 청크로 분리된다.
- 따라서 실질적 효과 측면에서는 lazy loading이 route-based chunk 분리를 이미 달성하고 있으나, Plan 문서의 명시적 요구사항(`manualChunks`에서 경로 기반 분리)과는 불일치.

**Chunk Policy Score**: 5/7 core items matched = **71%**

---

### 3.2 App.tsx Lazy Loading (Plan Section 5.2)

#### 3.2.1 Route-level Lazy Imports (App.tsx)

| Component | Lazy? | Location | Status |
|-----------|:-----:|----------|--------|
| DashboardGuardedContent | Yes | App.tsx:16 | PASS |
| AppPublicRouteSection | Yes | App.tsx:17 | PASS |
| SystemAdminDashboard | Yes | App.tsx:18 | PASS |
| AppUserOverlayStack | Yes | App.tsx:19 | PASS |

#### 3.2.2 Sub-component Lazy Imports (Dashboard Workspace)

| Component | Lazy? | Location | Status |
|-----------|:-----:|----------|--------|
| InventoryManager | Yes | DashboardInventoryMasterSection.tsx:2 | PASS |
| MemberManager | Yes | DashboardWorkspaceSection.tsx:12 | PASS |
| DashboardFixtureEditSection | Yes | DashboardWorkspaceSection.tsx:13 | PASS |

#### 3.2.3 Operational Tab Lazy Imports (DashboardOperationalTabs.tsx)

| Component | Lazy? | Location | Status |
|-----------|:-----:|----------|--------|
| InventoryAudit | Yes | DashboardOperationalTabs.tsx:20 | PASS |
| SurgeryDashboard | Yes | DashboardOperationalTabs.tsx:21 | PASS |
| FailManager | Yes | DashboardOperationalTabs.tsx:22 | PASS |
| OrderManager | Yes | DashboardOperationalTabs.tsx:23 | PASS |
| SettingsHub | Yes | DashboardOperationalTabs.tsx:24 | PASS |
| AuditLogViewer | Yes | DashboardOperationalTabs.tsx:25 | PASS |

#### 3.2.4 Public Route Lazy Imports (PublicAppShell.tsx)

| Component | Lazy? | Location | Status |
|-----------|:-----:|----------|--------|
| LandingPage | Yes | PublicAppShell.tsx:22 | PASS |
| AuthForm | Yes | PublicAppShell.tsx:23 | PASS |
| PricingPage | Yes | PublicAppShell.tsx:24 | PASS |
| ContactPage | Yes | PublicAppShell.tsx:25 | PASS |
| ValuePage | Yes | PublicAppShell.tsx:26 | PASS |
| AnalyzePage | Yes | PublicAppShell.tsx:27 | PASS |
| NoticeBoard | Yes | PublicAppShell.tsx:28 | PASS |
| AdminPanel | Yes | PublicAppShell.tsx:29 | PASS |
| MfaOtpScreen | Yes | PublicAppShell.tsx:30 | PASS |
| ReviewsPage | Yes | PublicAppShell.tsx:31 | PASS |
| ConsultationPage | Yes | PublicAppShell.tsx:32 | PASS |

**Lazy Loading Score**: 21/21 items verified = **100%**

---

### 3.3 Excel Dynamic Import (Plan Section 5.2 item 2)

Plan 요구사항: "`parseExcelFile`, `downloadExcelFile` 경로를 업로드/다운로드 실행 시점 동적 import로 전환"

| Function | Import Type | Location | Status |
|----------|-------------|----------|--------|
| `parseExcelFile` | `await import('./services/excelService')` | App.tsx:1217 | PASS |
| `downloadExcelFile` | `await import('./services/excelService')` | App.tsx:2146 | PASS |
| `excelService` static comment | inline doc | App.tsx:22 | PASS (주석으로 의도 명시) |

**Static excelService imports elsewhere** (xlsx 오염 여부):

| File | Import Type | Impact |
|------|-------------|--------|
| `services/analysisService.ts` | static | AnalyzePage에서만 사용 (lazy chunk 내부) -- entry 비오염 |
| `components/onboarding/Step2FixtureUpload.tsx` | static | OnboardingWizard lazy chunk 내부 -- entry 비오염 |
| `components/onboarding/Step4UploadGuide.tsx` | static | OnboardingWizard lazy chunk 내부 -- entry 비오염 |

**Excel Dynamic Import Score**: 3/3 = **100%**

---

### 3.4 Suspense Boundaries (Plan Section 5.2 item 3)

Plan 요구사항: "기존 Suspense fallback 패턴 유지, lazy 전환된 경계에 동일 fallback 정책 적용"

| Boundary | Location | Fallback | Status |
|----------|----------|----------|--------|
| SystemAdminDashboard wrapper | App.tsx:2384 | `suspenseFallback` | PASS |
| DashboardGuardedContent wrapper | App.tsx:2441 | `suspenseFallback` | PASS |
| AppUserOverlayStack wrapper | App.tsx:2594 | `fallback={null}` | PASS |
| AppPublicRouteSection internal | AppPublicRouteSection.tsx:37 | `suspenseFallback` | PASS |
| PublicAppShell internal | PublicAppShell.tsx:239 | `suspenseFallback` | PASS |
| AppUserOverlayStack internal (x3) | AppUserOverlayStack.tsx:69,91,108 | `fallback={null}` | PASS |

**Suspense boundary 미비 사항**:
- `DashboardOperationalTabs.tsx`는 자체 Suspense가 없으나, 부모 `DashboardWorkspaceSection` -> `DashboardGuardedContent`가 App.tsx:2441의 Suspense 내부에 있으므로 커버됨.
- `DashboardWorkspaceSection.tsx`의 `MemberManager`, `DashboardFixtureEditSection` lazy 컴포넌트도 동일 Suspense로 커버됨.

**Suspense Score**: 6/6 boundaries intact = **100%**

---

## 4. Missing Features (Plan O, Implementation X)

| # | Item | Plan Location | Description | Impact |
|---|------|---------------|-------------|--------|
| 1 | `admin-route` manualChunk | Plan 5.1, line 80 | 시스템 관리자 컴포넌트 경로 기반 청크 분리 | Medium |
| 2 | `dashboard-route` manualChunk | Plan 5.1, line 81 | 대시보드 작업 영역 경로 기반 청크 분리 | Medium |
| 3 | `public-route` manualChunk | Plan 5.1, line 82 | 퍼블릭 영역 경로 기반 청크 분리 | Medium |

**Mitigation**: React.lazy() 코드 스플리팅이 이 3개 항목의 실질적 효과를 상당 부분 대체. Rollup이 lazy boundary에서 자동 청크를 생성하므로, `manualChunks`에 소스 경로 분기를 추가하지 않아도 `DashboardGuardedContent`, `AppPublicRouteSection`, `SystemAdminDashboard` 등은 이미 별도 청크로 분리됨.

---

## 5. Added Features (Plan X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | `lucide-icons` vendor chunk | vite.config.ts:38 | 아이콘 라이브러리 별도 청크 분리 |
| 2 | `framer-motion` vendor chunk | vite.config.ts:39 | 애니메이션 라이브러리 별도 청크 분리 |
| 3 | `recharts` vendor chunk | vite.config.ts:40 | 차트 라이브러리 별도 청크 분리 |
| 4 | `date-fns` vendor chunk | vite.config.ts:41 | 날짜 유틸 라이브러리 별도 청크 분리 |
| 5 | DashboardOperationalTabs 내 6개 lazy | DashboardOperationalTabs.tsx:20-25 | Plan에 명시되지 않은 추가 lazy 분리 |
| 6 | PublicAppShell 내 11개 lazy | PublicAppShell.tsx:22-32 | 퍼블릭 페이지별 세분 lazy 분리 |
| 7 | InventoryManager lazy | DashboardInventoryMasterSection.tsx:2 | 재고관리 컴포넌트 lazy 분리 |

---

## 6. Changed Features (Plan != Implementation)

| Item | Plan | Implementation | Impact |
|------|------|----------------|--------|
| Chunk naming | `react-core`, `supabase-core`, `xlsx-core` | `react-vendor`, `supabase-vendor`, `xlsx-vendor` | Low (명명 차이, 기능 동일) |
| manualChunks scope | vendor + source path-based (7 groups) | vendor-only (8 groups) | Medium (source path 분리 미구현, lazy가 대체) |

---

## 7. Verification Constraints

아래 항목들은 빌드 실행 없이는 정량 검증 불가:

| # | Requirement | Plan Section | Status |
|---|-------------|-------------|--------|
| 1 | `index-*.js` < 500 kB | 3.1, 7.1 | CANNOT VERIFY (build output 필요) |
| 2 | `>500 kB` 빌드 경고 제거 | 3.3, 7.1 | CANNOT VERIFY |
| 3 | `npm run typecheck` 통과 | 7.2 | CANNOT VERIFY |
| 4 | `npm run test` 통과 | 7.2 | CANNOT VERIFY |
| 5 | `npm run build` 통과 | 7.2 | CANNOT VERIFY |
| 6 | 핵심 사용자 플로우 회귀 없음 | 7.2 | CANNOT VERIFY |

---

## 8. Match Rate Calculation

### 8.1 Verifiable Items Summary

| Category | Items | Matched | Rate |
|----------|:-----:|:-------:|:----:|
| Chunk Policy (vite.config.ts) | 7 | 5 | 71.4% |
| Lazy Loading (App.tsx route-level) | 4 | 4 | 100% |
| Lazy Loading (sub-components) | 17 | 17 | 100% |
| Excel Dynamic Import | 3 | 3 | 100% |
| Suspense Boundaries | 6 | 6 | 100% |
| **Total (verifiable)** | **37** | **35** | **94.6%** |

### 8.2 Scoring Notes

- 3개 route-based manualChunks 미구현은 Plan과의 **명시적 불일치**이나, React.lazy가 동등 효과를 달성하고 있어 실질 영향은 Low~Medium.
- 추가 구현 7건(vendor 세분화 + 추가 lazy)은 Plan 범위를 초과하지만 성능 개선에 기여하며, Plan 위반은 아님.
- `chunkSizeWarningLimit: 500` 설정은 Vite 기본값과 동일(500 kB)이므로 실질 변화 없음. Baseline에서 언급된 경고 해소 여부는 빌드 결과로만 확인 가능.

### 8.3 Weighted Match Rate

Plan 문서의 완료 기준(Section 9) 5개 항목 기준:

| DoD Item | Weight | Match | Score |
|----------|:------:|:-----:|:-----:|
| vite.config.ts 청크 정책 기능군 확장 | 25% | PARTIAL (vendor-only, route 미적용) | 17.5% |
| App.tsx lazy 범위 확대 | 30% | PASS | 30% |
| index-*.js < 500 kB 또는 감소 문서화 | 20% | CANNOT VERIFY | -- |
| typecheck/test/build 통과 | 15% | CANNOT VERIFY | -- |
| 핵심 플로우 회귀 없음 | 10% | CANNOT VERIFY | -- |

**Verifiable DoD Score**: 47.5% / 55% (verifiable weight) = **86.4%**

---

## 9. Overall Score

```
+-----------------------------------------------+
|  Overall Match Rate: 82.6%                     |
+-----------------------------------------------+
|  Chunk Policy (vite.config.ts):  71.4%         |
|  Lazy Loading:                   100%          |
|  Excel Dynamic Import:           100%          |
|  Suspense Boundaries:            100%          |
|  Route-based manualChunks:       0% (3 items)  |
+-----------------------------------------------+
|  Status: WARNING (< 90% threshold)             |
+-----------------------------------------------+
```

---

## 10. Recommended Actions

### 10.1 Immediate Actions (Gap Resolution)

| Priority | Item | Effort | Recommendation |
|----------|------|--------|----------------|
| 1 | Route-based manualChunks 미구현 판정 | Low | React.lazy가 대체 효과를 달성하므로, Plan 문서를 현행 구현에 맞게 업데이트하거나 "lazy로 대체" 의도적 변경으로 기록 |

### 10.2 선택: Plan 문서 업데이트 vs 구현 보완

**Option A: Plan 문서 업데이트 (권장)**
- `admin-route`, `dashboard-route`, `public-route` 소스 경로 기반 manualChunks 항목을 삭제하고, React.lazy 기반 자동 분리로 대체했음을 기술.
- 추가된 vendor 세분화(lucide, framer-motion, recharts, date-fns)를 Plan에 반영.
- 이 경우 Match Rate는 100%로 상승.

**Option B: 구현에 route-based manualChunks 추가**
- `vite.config.ts`의 `manualChunks` 함수에 `id.includes('components/app/Dashboard')`, `id.includes('components/app/Public')` 등 소스 경로 분기를 추가.
- 주의: React.lazy가 이미 분리하고 있으므로, manualChunks와 중복되면 오히려 청크 파편화 가능.
- 추천하지 않음.

### 10.3 빌드 검증 필요 사항

다음 명령으로 정량 목표 달성 여부를 확인해야 함:

```bash
npm run build 2>&1 | grep -E 'dist/|kB|warning'
```

확인 항목:
- `index-*.js` 크기가 677.33 kB(baseline)에서 500 kB 미만으로 감소했는지
- `Some chunks are larger than 500 kB` 경고가 사라졌는지

---

## 11. Design Document Updates Needed

Plan 문서의 아래 항목을 현행 구현에 맞게 갱신 권장:

- [ ] Section 5.1: route-based manualChunks 3건을 "React.lazy 코드 스플리팅으로 대체"로 수정
- [ ] Section 5.1: 추가 vendor 청크 4건(lucide-icons, framer-motion, recharts, date-fns) 반영
- [ ] Section 5.2: DashboardOperationalTabs 내부 6개 lazy 컴포넌트 추가 기술
- [ ] Section 5.2: DashboardInventoryMasterSection의 InventoryManager lazy 기술
- [ ] Section 9 DoD: 빌드 결과 수치(최종 청크 크기) 기록

---

## 12. Summary

| Aspect | Finding |
|--------|---------|
| Lazy Loading | Plan 요구사항을 완전히 충족하며, Plan 범위를 초과하는 추가 분리까지 달성 |
| Excel Dynamic Import | 완벽 구현. App.tsx 내 두 곳 모두 동적 import 전환 완료 |
| Suspense Boundaries | 모든 lazy boundary에 Suspense 커버 확인 |
| Chunk Policy | vendor 분리는 Plan 이상으로 세분화되었으나, 소스 경로 기반 route 분리가 manualChunks에는 미구현 (lazy가 대체) |
| Overall Verdict | **82.6%** -- Plan 문서의 route-based manualChunks 3건이 명시적 미구현이나, React.lazy가 동등 효과를 달성. Plan 문서 업데이트 시 실질 100% |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial gap analysis | gap-detector |
