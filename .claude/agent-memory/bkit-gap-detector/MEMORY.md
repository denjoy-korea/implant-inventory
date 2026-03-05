# Gap Detector Memory

## Project: implant-inventory (DenJOY / DentWeb)

### Architecture Level
- Dynamic level: components, services, types, lib pattern
- No strict 4-layer separation; services call supabaseClient directly

### Key Patterns
- **Mutation Results**: `{ ok: true } | { ok: false; reason: 'conflict'|'not_found'|'error'; currentStatus?: T }` pattern used consistently across orderService and returnService
- **DB Mappers**: `dbToX()` functions in `services/mappers.ts` (dbToOrder, dbToReturnRequest, etc.)
- **Optimistic Updates**: setState -> API call -> rollback on failure pattern in App.tsx
- **Realtime**: `service.subscribeToChanges(hospitalId, callback)` pattern with cleanup via `supabase.removeChannel()`
- **Inventory Model**: Uses `stock_adjustment` field (not direct `current_stock` mutation)
- **Toast Pattern**: `showAlertToast(message, 'success'|'error'|'info')`

### Analysis History
| Feature | Date | Match Rate | Key Gaps |
|---------|------|-----------|----------|
| order-return-management | 2026-03-01 | 92.6% | Missing: RETURN_STATUS_FLOW, OrderFilterBar/StatusBadge/ReturnStatusStepper components, server-side filtering |
| mobile-ux | 2026-03-01 | 67.4% (42.3% features-only) | Missing: ReturnRequestModal bottom sheet, Sidebar swipe gesture, FailManager chart swipe, select text-base, scroll restore. Bug fixes 10/10. |
| return-unification | 2026-03-02 | 91.7% | Session 1: onAddOrder residual in DashboardInventoryMasterSection/WorkspaceSection. All 6 core design goals achieved. |
| return-unification-v2 | 2026-03-03 | 91.9% (combined) | Session 2: Stock timing change (requested-time deduction), terminology unification, CreateReturnParams type. 1 FAIL: ReturnCandidateModal "보유" residual. |
| order-return-unification-phase3-1 | 2026-03-03 | 95.7% | 7 checklist items: 6 PASS, 1 PARTIAL. OrderManager ReturnManager tab guard removed but button container has `hidden` CSS class. ReturnCandidateModal trivial ternary. |
| hospital-integrations | 2026-03-03 | 98.4% | 91 items checked. 3 PARTIAL: card title "외부 연동" vs "인테그레이션", Solapi test endpoint /users/v1/info vs /cash/v1/balance, plan doc says Business vs impl Plus. 0 FAIL. |
| feature-showcase | 2026-03-03 | 97.2% | 106 items checked. 0 FAIL, 0 missing. 27 intentional changes: glassmorphism upgrade (Cards 2-6), FAIL->교환 terminology (Card 3), minor spacing (Card 6). |
| performance-bundle-phase1 | 2026-03-03 | 82.6% | 37 items checked. 3 FAIL: route-based manualChunks (admin/dashboard/public) not in vite.config.ts. React.lazy achieves equivalent effect. 7 ADDED: 4 vendor chunks + 3 extra lazy scopes. Plan doc update recommended. |
| mobile-tab-ux-refactor | 2026-03-04 | 93.8% | Plan-based analysis (no design doc). Must Have 4/4 PASS. Should Have 1/3 (auto-scroll moot, mini % indicator deferred). 4 positive additions: select-all toggle, pending-qty indicator, "발주됨" badge, parallel bulk order. Dead code: OrderManager L620 hidden KPI block. |
| stock-calc-settings | 2026-03-04 | 100% | 37 items checked. 0 FAIL, 0 PARTIAL. Full match: StockCalcSettings interface+defaults, App.tsx ref+useEffect+parameterized sync, 4-file prop chain, SettingsHub preset buttons+steppers+validation+save. 3 positive additions (descriptions, UI bound guards, changed-state tracking). |
| pricing-strategy-redesign | 2026-03-05 | 83.3% | v7 skeptical: 42 items (v6 37 + v7 5). 35 PASS, 3 PARTIAL, 4 FAIL. NEW: G-01 return_management FeatureGate not applied anywhere (ReturnManager not in DashboardOperationalTabs), G-02 audit_history canAccess never called (Basic users can access Plus-only history), G-03 comparison table Basic column labeled "팀용" but maxUsers=1, G-04 "반품 관리" row missing from comparison, G-05 Plan doc Business retention "무제한" vs impl 24mo. Prior: E-05 Sidebar tooltip, E-06 audit_log business. |
| funnel-cvr-fix | 2026-03-05 | 100% | 8 items, 8 PASS. Design doc Section 2-B corrected (auth_start: eligibleCount=3, progressedCount=2, stepCvr=67). Zero gaps remain. |
| modal-accessibility (R-12~R-15) | 2026-03-05 | 100% | 16 items, 16 PASS. R-12: window.alert 0 remaining (toast replaced). R-13: window.confirm 0 remaining (ConfirmModal in 6 files + SystemAdminDashboard render). R-14: 9 role="button" all have onKeyDown. R-15: outline:2px solid, no outline:none, no ring. |
| crypto-security-hardening | 2026-03-05 | 73.5%->99.8% | v2: 9 PASS, 0 PARTIAL, 0 FAIL, 2 ACCEPTED DEVIATION. Fixed: H-2 legacy TTL, H-3 startup log, H-5 DB conditional update. C-2/C-3 remain accepted deviations. |
| codebase-optimization | 2026-03-05 | 88%->92.1% | v2: QW 5/5 PASS, ME 5P+1PARTIAL+1ACCEPTED+1UNKNOWN. App.tsx 2765->999 (under 1K threshold). Files>1K: 18->7 (beat ME target 8). 32 hooks (was 9). Phase 3 excluded (Week 3+). Archival eligible. |
| valuation-narrowing | 2026-03-05 | 83.3% | 15 items (WS3:6, WS4:3, WS5:6). WS4 100% (3/3). 1 FAIL: FR-W3-01 quality-check-template.md missing. 3 PARTIAL: FR-W3-02 28-day snapshots in progress, FR-W5-01-sub mrr-summary blocked, FR-W5-complete investor redaction pending. Design folder names diverge from impl (01-commercial->01-contracts etc). |

### Key File Paths
- Types: `/types.ts` (root level), `/types/plan.ts` (plan types extracted)
- Services: `/services/orderService.ts`, `/services/returnService.ts`, `/services/mappers.ts`
- Components: `/components/OrderManager.tsx`, `/components/ReturnManager.tsx`
- Migrations: `/supabase/migrations/`
- Design docs: `/docs/02-design/features/`
- Analysis output: `/docs/03-analysis/`
- Integration: `/components/IntegrationManager.tsx`, `/services/integrationService.ts`
- Edge Functions: `/supabase/functions/test-integration/index.ts`
- Landing: `/components/LandingPage.tsx` (features section lines 345-487)
- Pricing: `/components/PricingPage.tsx`, `/components/pricing/pricingData.tsx`, `/hooks/usePricingPage.ts`, `/components/FeatureGate.tsx`, `/components/UpgradeModal.tsx`, `/components/UpgradeNudge.tsx`, `/components/fail/FailManagementDemo.tsx`
- Plan Service: `/services/planService.ts`
- Dashboard Tabs: `/components/dashboard/DashboardOperationalTabs.tsx`
- Sidebar: `/components/Sidebar.tsx` (TAB_FEATURE_MAP line 28)
- Crypto: `/supabase/functions/crypto-service/index.ts`, `/services/cryptoUtils.ts`, `/services/authService.ts`
- User Types: `/types/user.ts` (DbProfile._decryptFailed line 110)
