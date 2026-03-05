# Codebase Optimization Plan

> PDCA Phase: Plan
> Created: 2026-03-05
> Feature: codebase-optimization
> Level: Dynamic (React + TypeScript + Vite + Tailwind CSS + Supabase)

---

## 1. Precision Measurement Summary

### 1.1 File & LOC Census

| Category | Files | LOC | % of Total |
|----------|------:|-----:|----------:|
| Components (`.tsx/.ts`) | 164 | 52,374 | 62.4% |
| Services (`.ts`) | 44 | 22,091 | 26.3% |
| -- of which: data files | 2 | 13,179 | 15.7% |
| -- of which: logic | 42 | 8,912 | 10.6% |
| Hooks (`.ts`) | 9 | 1,562 | 1.9% |
| Utils (`.ts`) | 7 | 209 | 0.2% |
| App.tsx | 1 | 2,765 | 3.3% |
| types.ts | 1 | 888 | 1.1% |
| Edge Functions (`.ts`) | 24 | 3,986 | 4.7% |
| SQL Migrations (`.sql`) | 70 | 4,212 | -- |
| **Total (excl. SQL)** | **250** | **83,875** | **100%** |

### 1.2 Build Output

| Metric | Value |
|--------|-------|
| Total dist/ | 8.5 MB |
| JS assets | 2.9 MB |
| Largest chunk | `xlsx-vendor` 325 KB |
| 2nd largest | `SystemAdminDashboard` 224 KB |
| 3rd largest | `index` (main bundle) 222 KB |
| Dependencies | 5 prod + 9 dev |

### 1.3 Structural Health

| Metric | Count | Threshold | Status |
|--------|------:|----------:|--------|
| Files > 400 LOC | 46 | < 20 | CRITICAL |
| Files > 1,000 LOC | 18 | 0 | CRITICAL |
| Components > 30 hooks | 12 | < 5 | WARNING |
| Data files in source | 2 (13,179 LOC) | 0 | WARNING |
| Dead code files | 4 confirmed | 0 | MINOR |
| Inline style usage | 158 occurrences | < 20 | WARNING |
| Type exports in single file | 87 | < 30 | WARNING |

---

## 2. Hotspot Analysis

### 2.1 Mega-Files (> 1,000 LOC) -- Refactoring Priority

| Rank | File | LOC | Hooks | Issue |
|-----:|------|----:|------:|-------|
| 1 | `services/fixtureReferenceBase.ts` | 10,555 | -- | Pure data, should be JSON |
| 2 | `App.tsx` | 2,765 | 96 | God component, 16 handlers |
| 3 | `services/dentweb-defaults.ts` | 2,624 | -- | Pure data, should be JSON |
| 4 | `components/OrderManager.tsx` | 2,290 | 47 | Monolith, 28 modal states |
| 5 | `components/DashboardOverview.tsx` | 1,949 | 44 | Multiple dashboard sections |
| 6 | `components/AuthForm.tsx` | 1,689 | 46 | Auth + MFA + social login |
| 7 | `components/SystemAdminDashboard.tsx` | 1,459 | 66 | Admin panel monolith |
| 8 | `components/FailManager.tsx` | 1,414 | 44 | Partially split, still large |
| 9 | `components/UserProfile.tsx` | 1,362 | 45 | Profile + settings + security |
| 10 | `components/SurgeryDashboard.tsx` | 1,347 | 55 | Dashboard + 8 chart types |
| 11 | `components/InventoryAudit.tsx` | 1,293 | 38 | Audit input + report (PDCA in progress) |
| 12 | `components/AnalyzePage.tsx` | 1,292 | 19 | Analysis page |
| 13 | `components/inventory/UnregisteredDetailModal.tsx` | 1,290 | 33 | Single modal, too complex |
| 14 | `components/PricingPage.tsx` | 1,245 | 32 | Pricing display |
| 15 | `components/system-admin/tabs/SystemAdminIntegrationsTab.tsx` | 1,217 | 44 | Integrations admin |
| 16 | `components/InventoryManager.tsx` | 1,155 | 25 | Inventory master |
| 17 | `components/SettingsHub.tsx` | 1,041 | 30 | Settings tabs |

### 2.2 Dead Code (Confirmed)

| File | LOC | Evidence |
|------|----:|---------|
| `components/UploadSection.tsx` | 125 | 0 imports anywhere |
| `components/RefractionEffect.tsx` | 165 | 0 imports anywhere |
| `services/makePaymentService.ts` | 114 | 0 imports (payment not yet integrated) |
| `services/fixtureReferenceService.ts` | 168 | 0 imports (replaced by direct import) |
| **Total dead code** | **572** | |

### 2.3 Data-as-Code (15.7% of LOC)

| File | LOC | Description |
|------|----:|-------------|
| `services/fixtureReferenceBase.ts` | 10,555 | Fixture reference data (from Excel) |
| `services/dentweb-defaults.ts` | 2,624 | DentWeb fixture defaults |
| **Total** | **13,179** | **15.7% of entire codebase is static data** |

These files inflate LOC counts, slow IDE indexing, bloat the main bundle if not properly chunked, and make diffs noisy.

### 2.4 App.tsx God Component

| Metric | Value |
|--------|-------|
| Total LOC | 2,765 |
| React hooks | 96 |
| Handler functions | 25 |
| Service imports | 17 |
| Type imports | 1 line, 15+ types |
| Prop drilling depth | App -> DashboardGuardedContent -> DashboardWorkspaceSection -> DashboardOperationalTabs -> [Managers] |

App.tsx is the single largest architectural debt. It holds global state, data loading, realtime subscriptions, and all business logic handlers.

### 2.5 Bundle Size Hotspots

| Chunk | Size | Contains |
|-------|-----:|----------|
| `xlsx-vendor` | 325 KB | xlsx library (already dynamic import) |
| `SystemAdminDashboard` | 224 KB | Admin panel (< 1% users need this) |
| `index` (main) | 222 KB | Core app shell |
| `react-vendor` | 216 KB | React runtime (unavoidable) |
| `InventoryManager` | 188 KB | Inventory master |
| `supabase-vendor` | 163 KB | Supabase client |
| `OrderManager` | 157 KB | Order management |
| `DashboardGuardedContent` | 130 KB | Dashboard wrapper |

---

## 3. Optimization Team Structure

### Team Composition (Dynamic Level, 3 specialists)

| Role | Agent | Primary Focus |
|------|-------|---------------|
| **Frontend Architect** | `frontend-architect` | Component splitting, code splitting strategy, bundle optimization |
| **Backend Expert** | `bkend-expert` | Data externalization, service consolidation, hook extraction |
| **QA Strategist** | `qa-strategist` | Regression testing, import verification, build validation |

### CTO (Orchestrator) Responsibilities
- Priority sequencing across 3 phases
- Build size regression gates (target: < 2.5 MB JS assets)
- Conflict resolution between refactoring streams

---

## 4. Optimization Priority Matrix

### Phase 1: Quick Wins (1-2 days, low risk, high impact)

| ID | Task | Owner | LOC Impact | Risk |
|----|------|-------|----------:|------|
| QW-1 | Delete dead code (4 files, 572 LOC) | Backend Expert | -572 | None |
| QW-2 | Move `fixtureReferenceBase.ts` to JSON + dynamic import | Backend Expert | -10,555 TS -> JSON | Low |
| QW-3 | Move `dentweb-defaults.ts` to JSON + dynamic import | Backend Expert | -2,624 TS -> JSON | Low |
| QW-4 | Delete `.claude/worktrees/` orphaned artifacts (5 MB, 84 files) | Backend Expert | cleanup | None |
| QW-5 | Split `types.ts` (888 LOC, 87 exports) into domain modules | Frontend Architect | restructure | Low |

**Estimated Impact**: -13,751 LOC of TS, 13,179 LOC moved to JSON, cleaner IDE indexing.

### Phase 2: Medium Effort (3-5 days, moderate risk)

| ID | Task | Owner | LOC Impact | Risk |
|----|------|-------|----------:|------|
| ME-1 | Split `App.tsx` (2,765 LOC) into context providers + route shell | Frontend Architect | -2,000+ | Medium |
| ME-2 | Split `OrderManager.tsx` (2,290 LOC) into sub-components | Frontend Architect | restructure | Medium |
| ME-3 | Split `DashboardOverview.tsx` (1,949 LOC) into section components | Frontend Architect | restructure | Medium |
| ME-4 | Split `AuthForm.tsx` (1,689 LOC) into auth step components | Frontend Architect | restructure | Medium |
| ME-5 | Extract `useAppState.ts` (669 LOC) into smaller domain hooks | Backend Expert | restructure | Medium |
| ME-6 | Convert 158 inline styles to Tailwind utilities | Frontend Architect | consistency | Low |
| ME-7 | Additional lazy() splitting for non-initial routes | Frontend Architect | bundle -200KB+ | Low |

**Priority sub-ordering for ME tasks**:
1. ME-1 (App.tsx) first -- unblocks all other component refactors
2. ME-7 (lazy loading) second -- immediate UX/performance win
3. ME-2, ME-3, ME-4 can run in parallel after ME-1
4. ME-5 after ME-1 (depends on App.tsx architecture)
5. ME-6 lowest priority (cosmetic consistency)

### Phase 3: Long-Term (1-2 weeks, strategic)

| ID | Task | Owner | LOC Impact | Risk |
|----|------|-------|----------:|------|
| LT-1 | Extract domain contexts (Inventory, Order, Fail, Surgery) from App.tsx | Frontend Architect | architecture | High |
| LT-2 | Split remaining 13 mega-components (> 1,000 LOC each) | Frontend Architect | -5,000+ | Medium |
| LT-3 | Consolidate services/ -- merge small utils, extract shared patterns | Backend Expert | -500+ | Low |
| LT-4 | Edge Function dedup -- shared CORS/auth/error patterns | Backend Expert | -800+ | Low |
| LT-5 | Implement route-level code splitting (React Router or custom) | Frontend Architect | architecture | High |
| LT-6 | Create component library (`components/ui/`) for shared primitives | Frontend Architect | DRY | Medium |
| LT-7 | SQL migration squash (70 migrations -> consolidated) | Backend Expert | maintenance | Medium |

---

## 5. App.tsx Decomposition Strategy (ME-1 Detail)

Current architecture:
```
App.tsx (2,765 LOC, 96 hooks)
  -> useAppState (669 LOC)
  -> 17 service imports
  -> 25 handler functions
  -> prop drilling 4 levels deep
```

Target architecture:
```
App.tsx (~300 LOC, shell only)
  -> AppProviders.tsx (context composition)
       -> InventoryContext (state + handlers)
       -> OrderContext (state + handlers)
       -> ReturnContext (state + handlers)
       -> FailContext (state + handlers)
       -> AuthContext (already via useAppState partially)
  -> AppRoutes.tsx (route switching)
  -> AppGlobalEffects.tsx (realtime, PWA, analytics)
```

### Key Constraints
- `state: AppState` is a single large object -- must be split into domain slices
- Realtime subscriptions (inventory, surgery, orders) are in `useAppState` -- keep centralized
- `handleConfirmReceipt`, `handleStockAdjust` etc. cross domain boundaries -- need event bus or shared context

---

## 6. Data Externalization Strategy (QW-2, QW-3 Detail)

### Current
```typescript
// fixtureReferenceBase.ts - 10,555 lines of TypeScript
export const FIXTURE_REFERENCE_BASE: FixtureReferenceRow[] = [ ... ];
```

### Target
```
/public/data/fixture-reference-base.json    (loaded on demand)
/public/data/dentweb-defaults.json          (loaded on demand)
```

```typescript
// services/fixtureReferenceBase.ts - ~30 lines
let _cache: FixtureReferenceRow[] | null = null;
export async function getFixtureReferenceBase(): Promise<FixtureReferenceRow[]> {
  if (_cache) return _cache;
  const res = await fetch('/data/fixture-reference-base.json');
  _cache = await res.json();
  return _cache;
}
```

**Benefits**:
- TypeScript compilation speed improves (10,555 fewer lines to type-check)
- Bundle size drops (data loaded on demand, not in JS chunks)
- IDE performance improves (no giant data arrays in memory)
- Git diffs become cleaner (JSON data changes are separate from code changes)

---

## 7. Success Metrics

| Metric | Current | QW Target | ME Target | LT Target |
|--------|--------:|----------:|----------:|----------:|
| TS/TSX LOC | 84,000 | 70,000 | 65,000 | 55,000 |
| Files > 1,000 LOC | 18 | 16 | 8 | 2 |
| Files > 400 LOC | 46 | 42 | 25 | 15 |
| JS bundle (assets/) | 2.9 MB | 2.7 MB | 2.3 MB | 2.0 MB |
| Max hooks per component | 96 | 96 | 30 | 20 |
| Dead code files | 4 | 0 | 0 | 0 |
| Data-as-code LOC | 13,179 | 0 | 0 | 0 |

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regression in component splitting | Medium | High | QA Strategist runs full build + type check per split |
| State management bugs during App.tsx decomposition | High | High | Incremental extraction, keep AppState initially, add contexts gradually |
| Data loading race conditions after JSON externalization | Low | Medium | Cache + loading states, test with slow network |
| Bundle chunk count explosion | Low | Low | Vite manualChunks config update |
| Import cycle introduction | Medium | Medium | ESLint no-cycle rule enforcement |

---

## 9. Execution Order

```
Week 1 (Quick Wins):
  Day 1: QW-1 (dead code) + QW-4 (worktree cleanup)
  Day 1: QW-2 + QW-3 (data externalization) -- parallel
  Day 2: QW-5 (types.ts split) + verification build

Week 1-2 (Medium Effort):
  Day 3: ME-1 (App.tsx context extraction -- first pass)
  Day 4: ME-7 (additional lazy loading)
  Day 5-6: ME-2 + ME-3 (OrderManager + DashboardOverview split) -- parallel
  Day 7: ME-4 + ME-5 (AuthForm + useAppState) -- parallel
  Day 8: ME-6 (inline style cleanup)

Week 3+ (Long-Term, as capacity allows):
  LT-1 through LT-7 in dependency order
```

---

## Appendix A: Complete File Inventory (> 400 LOC)

| LOC | File |
|----:|------|
| 10,555 | `services/fixtureReferenceBase.ts` |
| 2,765 | `App.tsx` |
| 2,624 | `services/dentweb-defaults.ts` |
| 2,290 | `components/OrderManager.tsx` |
| 1,949 | `components/DashboardOverview.tsx` |
| 1,689 | `components/AuthForm.tsx` |
| 1,459 | `components/SystemAdminDashboard.tsx` |
| 1,414 | `components/FailManager.tsx` |
| 1,362 | `components/UserProfile.tsx` |
| 1,347 | `components/SurgeryDashboard.tsx` |
| 1,293 | `components/InventoryAudit.tsx` |
| 1,292 | `components/AnalyzePage.tsx` |
| 1,290 | `components/inventory/UnregisteredDetailModal.tsx` |
| 1,245 | `components/PricingPage.tsx` |
| 1,217 | `components/system-admin/tabs/SystemAdminIntegrationsTab.tsx` |
| 1,155 | `components/InventoryManager.tsx` |
| 1,041 | `components/SettingsHub.tsx` |
| 888 | `types.ts` |
| 887 | `services/authService.ts` |
| 864 | `components/MemberManager.tsx` |
| 841 | `components/ReceiptConfirmationModal.tsx` |
| 805 | `components/onboarding/Step2FixtureUpload.tsx` |
| 785 | `components/LandingPage.tsx` |
| 692 | `components/inventory/OptimizeModal.tsx` |
| 669 | `hooks/useAppState.ts` |
| 660 | `services/analysisService.ts` |
| 583 | `components/FailBulkSetupModal.tsx` |
| 577 | `components/shared/LegalModal.tsx` |
| 568 | `components/system-admin/tabs/SystemAdminTrafficTab.tsx` |
| 556 | `components/order/ReturnCandidateModal.tsx` |
| 552 | `services/planService.ts` |
| 551 | `components/AddItemModal.tsx` |
| 514 | `components/inventory/BaseStockModal.tsx` |
| 506 | `components/system-admin/SystemAdminOverlayModals.tsx` |
| 496 | `components/ExcelTable.tsx` |
| 486 | `components/order/OrderHistoryPanel.tsx` |
| 478 | `components/ValuePage.tsx` |
| 458 | `supabase/functions/crypto-service/index.ts` |
| 444 | `components/AdminPanel.tsx` |
| 443 | `services/hospitalService.ts` |
| 432 | `services/surgeryService.ts` |
| 429 | `components/system-admin/tabs/SystemAdminBetaCodesTab.tsx` |
| 416 | `services/pwaUpdateService.ts` |
| 413 | `components/onboarding/Step4UploadGuide.tsx` |
| 410 | `components/AuditLogViewer.tsx` |
| 407 | `components/surgery-dashboard/useSurgeryStats.ts` |

## Appendix B: Dead Code Evidence

```
components/UploadSection.tsx       -- 0 imports found in entire codebase
components/RefractionEffect.tsx    -- 0 imports found in entire codebase
services/makePaymentService.ts     -- 0 imports (payment not yet integrated)
services/fixtureReferenceService.ts-- 0 imports (data used directly from fixtureReferenceBase)
```

## Appendix C: .claude/worktrees Artifact

```
Size: 5.0 MB
Files: 84 TS/TSX files (duplicates of main source)
Status: Orphaned worktree from previous agent session
Action: Safe to delete entirely
```
