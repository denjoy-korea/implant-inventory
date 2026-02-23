# Investor One-Pager (DenJOY / DentWeb)

> **Date**: 2026-02-24  
> **Product**: DenJOY / DentWeb (Dental Implant Inventory SaaS)  
> **Stack**: React + TypeScript + Vite + Tailwind + Supabase + Vercel  
> **Assessment Basis**: Codebase evidence + test/build snapshot + vertical SaaS benchmark references

---

## 1) Executive Verdict

**Current Stage: Beta+ (Commercialization Candidate with 1 technical release blocker)**

- Domain coverage is broad and practical: surgery records, inventory, FAIL workflow, orders, stock audit, member/permission management, pricing/plan gating, admin operations, onboarding.
- Multi-tenant and security architecture are materially implemented (hospital isolation and RLS-oriented service patterns).
- UI/UX quality is above typical internal MVP level for dashboard SaaS, with strong data-heavy workflow handling on desktop and mobile.
- Immediate blocker to "production-complete" status: typecheck/build fail due to route mapping mismatch.

**Overall Completion Score (Investor Readiness): 78 / 100**

---

## 2) Scoring Snapshot (Weighted)

| Dimension | Weight | Score | Weighted |
|---|---:|---:|---:|
| Functional Coverage | 30 | 85 | 25.5 |
| UI/UX & Workflow Quality | 20 | 79 | 15.8 |
| Security & Tenant Isolation | 20 | 82 | 16.4 |
| Reliability & Operations | 15 | 72 | 10.8 |
| Code Health & Delivery Readiness | 15 | 64 | 9.6 |
| **Total** | **100** |  | **78.1** |

Interpretation:
- **70-85**: Early production candidate / Seed-prep capable
- **85+**: Production-grade with low release risk

---

## 3) Evidence Highlights (Code-Level)

- App shell and route/tab orchestration: `App.tsx`, `appRouting.ts`
- Workspace dashboard composition: `components/app/DashboardWorkspaceSection.tsx`, `components/dashboard/DashboardOperationalTabs.tsx`
- Core domain modules:
  - Surgery analytics/workflows: `components/SurgeryDashboard.tsx`
  - Inventory master and optimization: `components/InventoryManager.tsx`
  - Sidebar permissions and plan locks: `components/Sidebar.tsx`
- Security and auth operations: `services/authService.ts`, `services/supabaseClient.ts`
- Tenant/domain typing and permission model: `types.ts`
- Security runbook and smoke criteria: `docs/04-report/security-smoke-test-checklist.md`

---

## 4) Quality Gate Snapshot (2026-02-24)

- `npm run test`: **PASS (100/100)**
- `npm run typecheck`: **FAIL**
  - `appRouting.ts(4,14): TS2741`
  - Cause: `View` includes `consultation`, but route map is missing `consultation`
- `npm run build`: **FAIL (blocked by same typecheck error)**

Investor meaning:
- Product risk is not in feature absence, but in **release discipline and integration consistency**.
- Fixing this blocker is low effort/high impact and should be done before external rollout.

---

## 5) Value Assessment (Range)

Exchange-rate assumption: **1 USD = 1,350 KRW**

### A. Replacement Value (Rebuild Cost Floor)
- **USD 90k - 300k**
- **KRW 1.2억 - 4.0억**

Rationale:
- Vertical SaaS complexity premium (domain workflows + multi-role + reporting + security)
- Already implemented breadth reduces greenfield uncertainty

### B. Product/Asset Value (Code + Domain Logic, Early Revenue Context)
- **USD 220k - 900k**
- **KRW 3.0억 - 12.0억**

Rationale:
- Broad implemented scope with meaningful domain fit
- Discount applied for unresolved release blocker and unknown live traction metrics

### C. Seed-Ready Upside (Post-Validation Scenario)
- Trigger condition: 2-5 paying hospitals, stable MRR trend, churn visibility
- **USD 1.0M - 5.0M**
- **KRW 13.5억 - 67.5억**

---

## 6) Fastest Path to Value Uplift (30-60 Days)

1. **Release Gate Green**: add missing `consultation` route mapping and restore typecheck/build green.
2. **Monolith Risk Reduction**: continue splitting large orchestration surfaces (`App.tsx`) into bounded modules.
3. **Commercial Metrics Layer**: investor-facing KPI board for MRR, retention, active hospitals, and support SLA.
4. **Production Proof Pack**: one-page reliability/security evidence bundle (tests, smoke checks, migration integrity).

Expected impact:
- Improves due-diligence confidence and moves valuation toward upper bound of current stage.

---

## 7) Note

This document is a technical-commercial assessment for planning and investor communication. It is not legal, tax, or securities advice.
