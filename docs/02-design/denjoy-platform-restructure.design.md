# DenJOY Platform Restructure Design

> Date: 2026-04-04
> Status: Plan (code freeze -- analysis + execution plan only)
> Scope: denjoy.info = brand hub / implant-inventory = first solution under the hub
> Prerequisite: `hospital-multi-service-platform.design.md` (2026-04-03)

---

## 1. Executive Summary

implant-inventory codebase has grown into a de facto multi-service platform, but its
routing, identity, and analytics layers still assume it IS the single product.
This document diagnoses 10 concrete problems (file:line evidence) and defines a
P0/P1/P2 execution plan to restructure the app into a proper 3-tier architecture:

```
Layer 1 -- Brand Portal (denjoy.info /)
    HomepagePage, AboutPage, ConsultingPage, SolutionsPage, CoursesPage, BlogPage, CommunityPage
    HomepageHeader / HomepageFooter

Layer 2 -- Solution Landing (denjoy.info /inventory)
    LandingPage, ValuePage, PricingPage, AnalyzePage, ReviewsPage, NoticeBoard
    Header (solution-scoped) / PublicMobileNav

Layer 3 -- Operational App (denjoy.info /dashboard, /mypage, /admin)
    DashboardWorkspaceSection, MyPage, ServiceAdminPage
    Sidebar / Dashboard chrome
```

---

## 2. Current State Diagnosis

### P0-1. Public routing duality -- `homepage` vs `landing`

**Symptom**: Two conceptually distinct layers (brand portal vs inventory landing)
share the same routing/rendering pipeline with ad-hoc `isBrandPage` boolean branching.

| File | Line | Evidence |
|------|------|----------|
| `appRouting.ts` | 5 | `homepage: ''` and `landing: 'implant-inventory'` coexist as hash routes |
| `components/app/PublicAppShell.tsx` | 200 | `publicViews` array mixes both layers: `['homepage', 'landing', 'value', ...]` |
| `components/app/PublicAppShell.tsx` | 202 | `isBrandPage` manually lists pages: `['homepage', 'contact', 'about', ...]` |
| `components/app/PublicAppShell.tsx` | 203 | `isServiceHubView` = `mypage` or `admin_panel` -- third category added ad-hoc |
| `components/app/PublicAppShell.tsx` | 204 | `usesHomepageHeaderShell` = login/signup or service hub -- controls header selection |
| `components/app/PublicAppShell.tsx` | 495-516 | Conditional header rendering: `!isBrandPage && !isServiceHubView` shows `Header` + `PublicMobileNav` |

**Root cause**: There is no formal layer enum. The codebase uses boolean combinations
(`isBrandPage`, `isServiceHubView`, `usesHomepageHeaderShell`) that grow with each
new view. Adding a new brand page requires updating 3+ boolean checks.

### P0-2. `handleNavigate` mixes pathname and hash routing

| File | Line | Evidence |
|------|------|----------|
| `PublicAppShell.tsx` | 307-320 | `handleNavigate` pushes `window.history.pushState` for "root pages" |
| `PublicAppShell.tsx` | 313-317 | Manual `isRootPage` list: `['homepage', 'about', 'consulting', 'solutions', ...]` |
| `PublicAppShell.tsx` | 316 | Special case: `landing` -> `/inventory` pathname mapping |
| `appRouting.ts` | 38-54 | Hash-based routing (`#/implant-inventory`, `#/dashboard/...`) |
| `hooks/useAppState.ts` | 63-79 | `getInitialState()` reads `window.location.pathname` for brand pages but falls back to hash for others |

**Root cause**: Brand pages use pathname routing (`/about`, `/consulting`), while
the original inventory app uses hash routing (`#/login`, `#/dashboard`). Two routing
paradigms coexist without a unifying router.

### P0-3. Project identity still says "implant inventory"

| File | Line | Evidence |
|------|------|----------|
| `index.html` | 6 | `<title>` = "Implant Inventory DentWeb" |
| `index.html` | 7 | `<meta description>` = "Chi-gwa implant jaego-gwanri system" |
| `index.html` | 8-9 | OG tags = "Implant Inventory" |
| `public/manifest.webmanifest` | 2-4 | `name` = "Implant Inventory", `short_name` = "Implant Inventory", `description` = "Dental implant inventory system" |
| `package.json` | 2 | `name` = "implant-inventory-system-with-dentweb" |
| `README.md` | 1 | Title = "# Implant Inventory" |

**Impact**: Google indexes denjoy.info as an inventory app. PWA install shows
"Implant Inventory" instead of "DenJOY". Returning visitors see inventory-specific metadata
even when visiting brand portal pages.

### P1-4. Dual header components

| File | Lines | Role |
|------|-------|------|
| `components/Header.tsx` | 1-229 | Solution-scoped header -- shows inventory-specific nav (landing, value, pricing, reviews, notices, analyze) |
| `components/home/HomepageHeader.tsx` | 1-~120 | Brand portal header -- shows brand nav (about, consulting, solutions, courses, blog, community) |
| `components/PublicMobileNav.tsx` | 1-99 | Solution-only mobile nav -- 6 buttons all inventory-related |

**Problems**:
- `Header.tsx:34` sets `showGuestAuthActions = false` with comment "login/signup is main home only" -- auth actions are disabled in the solution header entirely
- `Header.tsx:46-54` logo area says "Powered by DenJOY" in both headers (duplicated markup)
- `PublicMobileNav.tsx:57-60` has a "Jaego-gwanri" (inventory) button that navigates to `landing` -- no brand portal mobile nav exists
- `PublicAppShell.tsx:480-514` chooses between `HomepageHeader` and `Header` based on the boolean matrix

### P1-5. Login redirects directly to inventory data loading

| File | Line | Evidence |
|------|------|----------|
| `hooks/useAppState.ts` | 108-248 | `loadHospitalData()` -- immediately loads inventory, surgery, orders data |
| `hooks/useAppState.ts` | 170-176 | `Promise.all([inventoryService.getInventory(), surgeryService.getSurgeryRecords(), orderService.getOrders(), ...]` |
| `hooks/useAppState.ts` | 206-222 | Sets `currentView: 'mypage'` after load -- no service selection step |
| `hooks/useAppState.ts` | 277-281 | `handleLoginSuccess` -> `loadHospitalData` -> immediate inventory data fetch |

**Impact**: When DenJOY becomes a multi-service portal, login should route to a
service launcher (MyPage), not automatically load inventory-specific data. Currently,
any login (even for consulting or HR users) triggers inventory data fetch, wasting
bandwidth and exposing data.

### P1-6. `hospitals.plan` remains source of truth for inventory plan

| File | Line | Evidence |
|------|------|----------|
| `hooks/useAppState.ts` | 161 | `planService.checkPlanExpiry(user.hospitalId)` -- reads `hospitals.plan` column |
| `services/serviceEntitlementService.ts` | 84-103 | `buildFallbackImplantInventorySubscription()` -- when `hospital_service_subscriptions` table is missing, falls back to hardcoded `implant_inventory` active subscription |
| `services/serviceEntitlementService.ts` | 43-48 | `isMissingServiceSchemaError()` -- gracefully handles missing `service_catalog` / `hospital_service_subscriptions` tables |

**Impact**: `hospital_service_subscriptions` was designed (in `hospital-multi-service-platform.design.md`)
to be the canonical source of service entitlements. But the fallback logic means the old
`hospitals.plan` column still drives all inventory access decisions. The new table is
effectively a no-op until the fallback is removed.

### P1-7. Homepage copy is internally focused

| File | Evidence |
|------|----------|
| `components/HomepagePage.tsx` | Sections: `HeroSection`, `PainPointsSection`, `StatsSection`, `FourPillarsSection`, `SolutionShowcaseSection`, `CoursesPreviewSection`, `SocialProofSection`, `FounderSection`, `MicroCommitmentSection`, `CTASection` |
| `components/home/HeroSection.tsx` | Likely focuses on DenJOY as a brand, but `SolutionShowcaseSection` specifically mentions inventory |

**Assessment**: The homepage mixes brand positioning with inventory-specific marketing.
`SolutionShowcaseSection` should be a generic "our solutions" gallery, not an inventory demo.
The `FourPillarsSection` likely maps to the 4 service categories but needs verification.

### P2-8. `homepage` entitlement semantic collision

| File | Line | Evidence |
|------|------|----------|
| `types/service.ts` | 3-9 | `PlatformServiceCode` includes `'homepage'` -- meaning a hospital homepage builder service |
| `types/service.ts` | 14-19 | `HospitalScopedServiceCode` includes `'homepage'` -- hospital can subscribe to homepage builder |
| `types/service.ts` | 79 | `DEFAULT_SERVICE_CATALOG` entry: `{ code: 'homepage', displayName: 'Homepage', subjectType: 'hospital', businessModel: 'b2b', ... }` |
| `appRouting.ts` | 5 | `VIEW_HASH` includes `homepage: ''` -- the brand portal root view |

**Collision**: `homepage` means two things:
1. The brand portal root view (`View = 'homepage'`)
2. A hospital-scoped paid service (homepage builder) in `service_catalog`

This will cause confusion when checking `hasHospitalServiceAccess('homepage')` --
does it mean "can this hospital build their own homepage" or "can they see the DenJOY homepage"?

### P2-9. Analytics funnel locked to inventory

| File | Line | Evidence |
|------|------|----------|
| `services/pageViewService.ts` | 18-20 | `PUBLIC_PAGES = new Set(['landing', 'pricing', 'analyze', 'contact', 'value', 'login', 'signup'])` |

**Impact**: Brand portal pages (`homepage`, `about`, `consulting`, `solutions`, `courses`,
`blog`, `community`) are NOT tracked. No funnel data for the brand portal visitor journey.

### P2-10. SEO root metadata is inventory-specific

(Diagnosed in P0-3 above; the SEO impact extends beyond identity to search ranking.)

| File | Evidence |
|------|----------|
| `index.html` | All `<meta>` tags describe inventory management |
| `PublicAppShell.tsx:326-383` | `PAGE_META` has per-view overrides, but the HTML-level SSR meta (what crawlers see before JS executes) is inventory-only |

---

## 3. Three-Tier Architecture Definition

### 3.1. Layer Boundaries

```
View Type       | Layer          | Header Component    | Footer          | Mobile Nav
----------------|----------------|---------------------|-----------------|-----------
homepage        | Brand Portal   | HomepageHeader      | HomepageFooter  | (new) BrandMobileNav
about           | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
consulting      | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
solutions       | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
courses         | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
blog            | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
community       | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
contact         | Brand Portal   | HomepageHeader      | HomepageFooter  | BrandMobileNav
login           | Brand Portal   | HomepageHeader      | --              | --
signup          | Brand Portal   | HomepageHeader      | --              | --
landing         | Solution Land. | SolutionHeader (*)  | PublicInfoFooter | SolutionMobileNav (*)
value           | Solution Land. | SolutionHeader      | PublicInfoFooter | SolutionMobileNav
pricing         | Solution Land. | SolutionHeader      | PublicInfoFooter | SolutionMobileNav
analyze         | Solution Land. | SolutionHeader      | PublicInfoFooter | SolutionMobileNav
reviews         | Solution Land. | SolutionHeader      | PublicInfoFooter | SolutionMobileNav
notices         | Solution Land. | SolutionHeader      | PublicInfoFooter | SolutionMobileNav
consultation    | Solution Land. | SolutionHeader      | PublicInfoFooter | SolutionMobileNav
mypage          | Service Hub    | HomepageHeader      | HomepageFooter  | --
admin_panel     | Service Hub    | HomepageHeader      | HomepageFooter  | --
dashboard       | Operational    | (Sidebar)           | --              | --
suspended       | Operational    | --                  | --              | --
```

(*) `SolutionHeader` = renamed `Header.tsx`; `SolutionMobileNav` = renamed `PublicMobileNav.tsx`

### 3.2. Layer Enum

```typescript
// types/app.ts (proposed addition)
export type AppLayer = 'brand' | 'solution' | 'service-hub' | 'operational';

export function getViewLayer(view: View): AppLayer {
  const BRAND_VIEWS: View[] = [
    'homepage', 'about', 'consulting', 'solutions', 'courses',
    'blog', 'community', 'contact', 'login', 'signup',
    'terms', 'privacy',
  ];
  const SOLUTION_VIEWS: View[] = [
    'landing', 'value', 'pricing', 'analyze', 'reviews',
    'notices', 'consultation',
  ];
  const SERVICE_HUB_VIEWS: View[] = ['mypage', 'admin_panel'];
  
  if (BRAND_VIEWS.includes(view)) return 'brand';
  if (SOLUTION_VIEWS.includes(view)) return 'solution';
  if (SERVICE_HUB_VIEWS.includes(view)) return 'service-hub';
  return 'operational';
}
```

This eliminates the `isBrandPage` / `isServiceHubView` / `usesHomepageHeaderShell` boolean soup
in `PublicAppShell.tsx` (lines 200-204).

---

## 4. P0 Execution Plan -- Routing and Identity (Immediate)

### P0-A. Introduce `AppLayer` and refactor `PublicAppShell` header selection

**Goal**: Replace 3 booleans with 1 switch on `getViewLayer()`.

**Files to change**:
1. `types/app.ts` -- add `AppLayer` type + `getViewLayer()` function
2. `components/app/PublicAppShell.tsx` lines 200-204 -- replace with:
   ```typescript
   const layer = getViewLayer(currentView);
   ```
3. `components/app/PublicAppShell.tsx` lines 480-516 -- replace boolean branching with:
   ```typescript
   {layer === 'brand' || layer === 'service-hub' ? <HomepageHeader ... /> : null}
   {layer === 'solution' ? <><SolutionHeader .../><SolutionMobileNav .../></> : null}
   ```

**Risk**: Low -- behavioral equivalent, just structural cleanup.

### P0-B. Unify pathname routing for all brand + solution pages

**Goal**: All public pages use pathname (`/about`, `/inventory`, `/pricing`), not hash.

**Files to change**:
1. `appRouting.ts` -- add `VIEW_PATH: Record<View, string>` mapping, deprecate `VIEW_HASH` for public views
2. `hooks/useAppState.ts` `getInitialState()` (lines 63-79) -- extend pathname parsing to cover all public views (currently only covers brand pages)
3. `components/app/PublicAppShell.tsx` `handleNavigate()` (lines 307-320) -- use `VIEW_PATH` instead of manual `isRootPage` list
4. `vite.config.ts` -- add SPA fallback rewrite rules (Vercel `rewrites` config) for all public paths

**Migration**: Hash routes (`#/implant-inventory`) should redirect to pathname equivalents
(`/inventory`) for backward compatibility. Dashboard remains hash-based (`#/dashboard/...`).

### P0-C. Update project identity to DenJOY platform

**Files to change**:
1. `index.html` lines 6-11 -- update `<title>` to "DenJOY | Dental Education / Consulting / Solutions", meta description to brand-level
2. `public/manifest.webmanifest` lines 2-4 -- `name: "DenJOY"`, `short_name: "DenJOY"`, `description` to brand-level
3. `package.json` line 2 -- `name: "denjoy-platform"` (or `denjoy-web`)
4. `README.md` line 1 -- `# DenJOY Platform`

**Risk**: Low -- metadata only. PWA users will see updated name on next visit.

### P0 Dependency Graph

```
P0-A (AppLayer type) ---> P0-B (routing unification, uses AppLayer for route classification)
P0-C (identity update) --- independent, can run in parallel
```

### P0 Estimated Effort

| Task | Files | Lines Changed (est.) | Complexity |
|------|-------|---------------------|------------|
| P0-A | 2 | ~40 | Low |
| P0-B | 4 | ~80 | Medium (backward compat) |
| P0-C | 4 | ~20 | Low |
| **Total** | **~8 unique files** | **~140** | |

---

## 5. P1 Execution Plan -- Header Unification, Login Flow, Entitlement (Short-term)

### P1-A. Rename and scope header components

**Goal**: Clear naming that maps to layers.

| Current | Renamed | Layer |
|---------|---------|-------|
| `components/home/HomepageHeader.tsx` | `components/brand/BrandHeader.tsx` | Brand Portal + Service Hub |
| `components/Header.tsx` | `components/solution/SolutionHeader.tsx` | Solution Landing |
| `components/PublicMobileNav.tsx` | `components/solution/SolutionMobileNav.tsx` | Solution Landing |
| (new) | `components/brand/BrandMobileNav.tsx` | Brand Portal |

**Key changes**:
- Extract shared logo section from both headers into `components/shared/BrandLogo.tsx`
- `SolutionHeader` gets `showGuestAuthActions` logic removed (auth is brand-layer concern)
- `BrandMobileNav` -- 4-5 button mobile nav for brand pages (home, solutions, courses, blog, contact)

### P1-B. Decouple login from inventory data loading

**Goal**: Login -> MyPage (service launcher) -> user chooses service -> load service data.

**Files to change**:
1. `hooks/useAppState.ts` `loadHospitalData()` (lines 108-248) -- split into:
   - `loadUserContext(user)` -- loads plan, hospital info, member count (light)
   - `loadInventoryData(user, hospitalId)` -- loads inventory, surgery, orders (heavy)
2. `hooks/useAppState.ts` `handleLoginSuccess()` (line 277) -- call only `loadUserContext`
3. `components/MyPage.tsx` -- add "Enter Inventory Workspace" button that triggers `loadInventoryData`

**Risk**: Medium -- changes the login flow. Requires careful state management so that
dashboard entry still works for users who go directly to `#/dashboard`.

### P1-C. Migrate plan source of truth to `hospital_service_subscriptions`

**Goal**: `serviceEntitlementService.getHospitalSubscriptions()` becomes the canonical check.

**Precondition**: `service_catalog` and `hospital_service_subscriptions` DB tables must exist
and be populated (migration from `hospital-multi-service-platform.design.md`).

**Files to change**:
1. `services/serviceEntitlementService.ts` lines 84-103 -- remove fallback; if table missing, throw (not silently succeed)
2. `hooks/useAppState.ts` line 161 -- replace `planService.checkPlanExpiry` with `serviceEntitlementService.hospitalHasServiceAccess('implant_inventory')` + read plan from subscription
3. `services/planService.ts` -- add `getServicePlan(hospitalId, serviceCode)` that reads from `hospital_service_subscriptions.service_plan_code`

### P1-D. Brand portal homepage content restructure

**Goal**: Homepage sections clearly separate brand identity from solution marketing.

**Changes** (content, not code structure):
- `HeroSection` -- brand-level value prop ("Education, Consulting, Solutions for dental clinics")
- `SolutionShowcaseSection` -- becomes a card grid linking to each solution landing page
- `FourPillarsSection` -- maps to 4 service pillars (inventory, HR, consulting, insurance)
- Remove inventory-specific demo from homepage; link to `/inventory` instead

### P1 Dependency Graph

```
P0-A -----> P1-A (header rename uses AppLayer)
             |
P0-B -----> P1-B (pathname routing enables proper MyPage landing)
             |
             +--> P1-C (entitlement separation enables service-aware MyPage)
                   |
                   +--> P1-D (content changes can happen in parallel)
```

### P1 Estimated Effort

| Task | Files | Lines Changed (est.) | Complexity |
|------|-------|---------------------|------------|
| P1-A | 6 (+2 new) | ~150 | Medium |
| P1-B | 3 | ~120 | Medium-High |
| P1-C | 3 | ~60 | Medium |
| P1-D | 4 | ~100 (content) | Low |
| **Total** | **~14 unique files** | **~430** | |

---

## 6. P2 Execution Plan -- Analytics, SEO, Entitlement Semantics (Mid-term)

### P2-A. Resolve `homepage` entitlement naming collision

**Option A (recommended)**: Rename the hospital homepage builder service code.

| File | Change |
|------|--------|
| `types/service.ts` line 4 | `'homepage'` -> `'hospital_homepage'` in `PlatformServiceCode` |
| `types/service.ts` line 16 | Same in `HospitalScopedServiceCode` |
| `types/service.ts` line 61 | `PLATFORM_SERVICE_LABELS.hospital_homepage` = 'Hospital Homepage' |
| `types/service.ts` line 79 | `DEFAULT_SERVICE_CATALOG` entry code update |
| DB migration | `UPDATE service_catalog SET code = 'hospital_homepage' WHERE code = 'homepage'` |
| DB migration | `UPDATE hospital_service_subscriptions SET service_code = 'hospital_homepage' WHERE service_code = 'homepage'` |

**Option B**: Rename the View type. **Rejected** -- too many downstream references to `view === 'homepage'`.

### P2-B. Extend analytics to brand portal pages

**Files to change**:
1. `services/pageViewService.ts` line 18 -- expand `PUBLIC_PAGES`:
   ```typescript
   const PUBLIC_PAGES = new Set([
     // Brand portal
     'homepage', 'about', 'consulting', 'solutions', 'courses', 'blog', 'community',
     // Solution landing
     'landing', 'pricing', 'analyze', 'contact', 'value', 'login', 'signup',
   ]);
   ```
2. Add `service_context` column to `page_views` table to distinguish which layer generated the view
3. Update `SystemAdminTrafficTab` funnel logic to support brand portal funnel alongside inventory funnel

### P2-C. Dynamic SEO meta by layer

**Goal**: Crawlers (which don't execute JS) see brand-level meta at `/`, solution-level at `/inventory`.

**Approach**: Since this is a Vite SPA (no SSR), options are:
1. **Vercel Edge Middleware** -- inject `<meta>` tags at edge based on pathname
2. **Pre-rendering** -- use `vite-plugin-ssr` or `prerender-spa-plugin` for public pages
3. **Accept client-side only** -- rely on `react-helmet-async` (current approach) and accept that
   Google's JS renderer will eventually see correct meta

**Recommended**: Option 1 (Vercel Edge Middleware) -- minimal code, SEO impact is immediate.

### P2 Estimated Effort

| Task | Files | Lines Changed (est.) | Complexity |
|------|-------|---------------------|------------|
| P2-A | 2 TS + 1 SQL migration | ~30 | Low |
| P2-B | 2 TS + 1 SQL migration | ~40 | Low |
| P2-C | 1 new middleware file | ~50 | Medium |
| **Total** | **~5 unique files** | **~120** | |

---

## 7. Implementation Order Summary

```
Phase   Task   Description                              Depends On   Est. LOC
------  -----  ---------------------------------------- -----------  --------
P0      P0-A   AppLayer type + PublicAppShell refactor   --           ~40
P0      P0-C   Project identity update                  --           ~20
P0      P0-B   Pathname routing unification              P0-A         ~80
        ---    P0 subtotal                                            ~140
P1      P1-A   Header rename + BrandMobileNav            P0-A         ~150
P1      P1-D   Homepage content restructure              --           ~100
P1      P1-B   Login flow decoupling                     P0-B         ~120
P1      P1-C   Entitlement source of truth migration     DB ready     ~60
        ---    P1 subtotal                                            ~430
P2      P2-A   homepage entitlement rename               P1-C         ~30
P2      P2-B   Analytics expansion                       P0-A         ~40
P2      P2-C   SEO edge middleware                       P0-C         ~50
        ---    P2 subtotal                                            ~120
        ===    Total estimated                                        ~690
```

---

## 8. Risk Registry

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Hash-to-pathname migration breaks bookmarks | Redirect middleware: `#/implant-inventory` -> `/inventory` |
| 2 | `loadHospitalData` split (P1-B) introduces race conditions | Keep single `loadKey` dedup pattern; add loading state per service |
| 3 | `hospital_service_subscriptions` table not yet populated | P1-C is gated on DB migration completion; fallback stays until migration confirmed |
| 4 | PWA manifest name change confuses existing installs | PWA spec handles name updates gracefully on next SW update |
| 5 | `homepage` rename (P2-A) requires DB migration | Run migration in a maintenance window; old rows are updated in-place |
| 6 | Vercel Edge Middleware (P2-C) adds latency | Middleware runs at edge (<5ms); SEO benefit outweighs cost |

---

## 9. Out of Scope

- Actual implementation (this is a plan document)
- `denjoy-homepage` Next.js project restructure (separate repo)
- `hr-denjoy` integration (covered in `hospital-multi-service-platform.design.md`)
- DB schema changes for `service_catalog` / `hospital_service_subscriptions` (already designed)
- Billing/payment flow changes for multi-service

---

## 10. Acceptance Criteria

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | All public pages use pathname routing | Manual: navigate to `/about`, `/inventory`, `/pricing` -- correct page renders |
| 2 | `AppLayer` enum eliminates boolean branching | Code review: no `isBrandPage` / `isServiceHubView` in `PublicAppShell.tsx` |
| 3 | `index.html` and `manifest.webmanifest` reflect DenJOY brand | Visual check: PWA install name, browser tab title |
| 4 | Login -> MyPage (no auto inventory load) | Network tab: no inventory/surgery API calls on login |
| 5 | `homepage` entitlement renamed to `hospital_homepage` | `grep 'homepage' types/service.ts` returns 0 in `PlatformServiceCode` |
| 6 | Brand portal pages tracked in analytics | Query `page_views WHERE page IN ('homepage', 'about', ...)` returns rows |
| 7 | Correct SEO meta per layer | View source at `/` shows brand meta, at `/inventory` shows inventory meta |
