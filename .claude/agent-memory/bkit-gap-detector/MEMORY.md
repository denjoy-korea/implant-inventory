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

### Key File Paths
- Types: `/types.ts` (root level)
- Services: `/services/orderService.ts`, `/services/returnService.ts`, `/services/mappers.ts`
- Components: `/components/OrderManager.tsx`, `/components/ReturnManager.tsx`
- Migrations: `/supabase/migrations/`
- Design docs: `/docs/02-design/features/`
- Analysis output: `/docs/03-analysis/`
