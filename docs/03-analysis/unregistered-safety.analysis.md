# Gap Analysis: unregistered-safety

- **Date**: 2026-03-21
- **Match Rate**: 100% (11/11 PASS)
- **Phase**: Check ✅

## 분석 항목

| # | 항목 | 결과 |
|---|------|:----:|
| 1 | new_dim 일괄 등록 제외 (`dimensionalMatchInfo !== 'new_dim'` 필터) | PASS |
| 2 | 개별 등록 ConfirmModal (new_dim=amber, 일반=indigo) | PASS |
| 3 | not_in_inventory "수정" 버튼 + ManualFixModal brand_fix 모드 | PASS |
| 4 | 테이블 시각 경고 (bg-amber-50/30, 배지, 버튼 라벨) | PASS |
| 5 | 건수 표시 개선 (`신규치수 K건(개별확인)`) | PASS |
| 6 | ManualFixModal brand_fix 모드 + forceApply | PASS |
| 7 | inventoryMatchResult 실시간 재고 일치 판별 | PASS |
| 8 | brand_fix 성공 시 기초재고 연동 조정 (onAdjustBaseStock) | PASS |
| 9 | rowKey 중복 방지 (raw vs resolved manufacturer 분리) | PASS |
| 10 | 일괄 등록 race condition 수정 (sharedKeySet 워커 공유) | PASS |
| 11 | bulkRegisterProgress null 리셋 | PASS |

## 수정 파일 목록

- `components/inventory/UnregisteredDetailModal.tsx`
- `components/inventory/unregistered/UnregisteredItemsTable.tsx`
- `components/inventory/ManualFixModal.tsx`
- `hooks/useSurgeryManualFix.ts`
- `components/InventoryManager.tsx`
- `components/app/DashboardInventoryMasterSection.tsx`
