# CTO Lead Agent Memory

## Project: implant-inventory (DenJOY)
- Dynamic level project (React + TypeScript + Vite + Tailwind CSS + Supabase)
- Korean dental implant inventory management SaaS
- Hospital-scoped data isolation with RLS

## Codebase Metrics (2026-03-05)
- 257 TS/TSX files, 84,000 LOC (excl. worktrees)
- 70 SQL migrations (4,212 LOC), 22 Edge Functions (3,986 LOC)
- 46 files exceed 400 LOC, 18 exceed 1,000 LOC
- 13,179 LOC is pure data (fixtureReferenceBase + dentweb-defaults)
- App.tsx = 2,765 LOC, 96 hooks, 25 handlers (God component)
- Build: 2.9 MB JS assets, 5 prod deps + 9 dev deps
- Dead code: 4 files confirmed (572 LOC)
- See `docs/01-plan/features/codebase-optimization.plan.md`

## Current PDCA: codebase-optimization
- Phase: Plan (completed 2026-03-05)
- Team: frontend-architect, bkend-expert, qa-strategist
- Quick Wins: dead code removal, data externalization to JSON, worktree cleanup
- Medium: App.tsx decomposition, OrderManager/DashboardOverview/AuthForm split
- Long-term: Domain contexts, component library, SQL squash

## Previous PDCA: audit-report-dashboard
- Phase: Plan (completed 2026-03-04)
- Component structure: `components/audit/` with 7+ sub-components

## Architecture Patterns Observed
- Component splitting: sub-components in feature folders (fail/, order/, audit/)
- Custom hooks for domain logic extraction (useSparklineSeries pattern)
- Utility functions in utils/ or feature-local utils/
- `isMobileViewport` pattern for responsive branching (matchMedia)
- File size target: 400 lines per component max
- Prop drilling: App -> DashboardGuardedContent -> WorkspaceSection -> OperationalTabs -> Managers

## Key Hotspots
- `App.tsx` (2,765 LOC) -- highest priority refactor target
- `services/fixtureReferenceBase.ts` (10,555 LOC) -- data -> JSON
- `components/OrderManager.tsx` (2,290 LOC, 28 modal states)
- `components/DashboardOverview.tsx` (1,949 LOC)
- `types.ts` (888 LOC, 87 exports) -- needs domain split
