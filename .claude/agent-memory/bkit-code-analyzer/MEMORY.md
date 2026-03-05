# Code Analyzer Memory

## Project Overview
- Dental implant inventory SaaS: React + TypeScript + Vite + Tailwind + Supabase
- Source files at project root (NOT under `src/`)
- Key paths: `components/`, `services/`, `hooks/`, `utils/`, `supabase/functions/`

## Key Findings (2026-03-05)

### Critical Issues
- **Payment amount not server-validated**: billing_history.amount is client-written; no server check that amount matches canonical plan price
- **PLAN_LIMITS Basic=Free features**: identical feature arrays (only numeric limits differ)
- **process_payment_callback**: was GRANT authenticated in migration 013, fixed to service_role in 022 (verify applied)
- **adjustStock fallback**: read-modify-write race condition (non-atomic)

### Architecture Debt
- App.tsx: 2757 lines monolith
- OrderManager.tsx: 2290 lines
- All plan enforcement is client-side only (no RLS/trigger checks)
- FeatureGate UpgradeModal onSelectPlan is a no-op (just closes modal)
- z-index: centralized constants exist but inconsistently adopted

### Security Notes
- `.env.local` is gitignored (safe)
- CORS: strict origin allowlist in `_shared/cors.ts`
- CSP: has unsafe-inline and unsafe-eval
- toss-payment-confirm Edge Function: no config.toml (defaults to verify_jwt=true)
- PII encryption: server-side via crypto-service Edge Function

### File Size Reference
- App.tsx: 2757, OrderManager.tsx: 2290, FailManager.tsx: 1414
- SurgeryDashboard.tsx: 1258, InventoryManager.tsx: 1134
