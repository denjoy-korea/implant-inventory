# Product Manager Agent Memory - DenJOY (implant-inventory)

## Project Overview
- 치과 임플란트 재고 관리 SaaS (DenJOY / DentWeb)
- 병원(hospital) 단위 RLS 격리
- Stack: React + TypeScript + Vite + Tailwind + Supabase

## Key File Locations
- Types: `/types.ts` (OrderType, OrderStatus, DbOrder, DbOrderItem, InventoryItem)
- Services: `/services/orderService.ts`, `/services/inventoryService.ts`
- Components: `/components/OrderManager.tsx`, `/components/FailManager.tsx`
- Plan docs: `/docs/01-plan/features/`
- PDCA memory: `/docs/.bkit-memory.json`

## Existing Order System (as of 2026-02-28)
- `OrderType`: `'replenishment' | 'fail_exchange' | 'return'`
- `OrderStatus`: `'ordered' | 'received'`
- DB tables: `orders`, `order_items` (with RLS on hospital_id)
- `orderService` uses optimistic locking via `expectedCurrentStatus` option
- Realtime subscription pattern: `subscribeToChanges(hospitalId, callback)`
- Transaction RPC: `create_order_with_items` stored procedure exists

## Active PDCA Features
- `order-return-management` - Phase: plan (started 2026-02-28)
  - Plan doc: `/docs/01-plan/features/order-return-management.plan.md`

## Completed Plans (for reference)
- `hospital-integrations` - Phase: design
- `member-management`, `withdrawal-process`, `crypto-security-hardening` - completed

## Plan Writing Patterns
- Always check existing `orders` table types in `types.ts` before proposing schema changes
- Use nullable column additions (not table drops) for DB migrations
- Reference `canManageOrders` permission for all order-related actions
- FAIL management uses `'수술중교환'` / `'교환완료'` row classification in surgery records

## Domain Knowledge: Implant Industry
- Major Korean manufacturers: 오스템, 덴티움, 네오바이오텍, 메가젠
- FAIL exchange is standard industry practice (무상 교환 through sales rep)
- Lead time for Korean manufacturers: 1-2 days (urgent: same day)
- Dead stock: typically handled by return negotiation with sales rep (not formal policy)
- ROP formula: `ROP = avg_daily_usage * lead_time_days + safety_stock`
