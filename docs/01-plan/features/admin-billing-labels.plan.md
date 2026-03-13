# Plan: admin-billing-labels

## 목표
운영자 어드민 패널의 결제내역(payments 탭)에서 업그레이드/다운그레이드 내역이 명확히 식별되도록 표시를 개선한다.

## 배경 / 문제

### 현재 상태
- `billing_history` 테이블에는 모든 플랜 변경이 기록됨 (카드 결제, 크레딧 결제, 어드민 수동, plan_change)
- 단, `AdminPanel.tsx`의 `PAYMENT_METHOD_LABELS`에 다음 값들이 **누락**됨:
  - `admin_manual` → raw 텍스트 그대로 노출
  - `plan_change` → raw 텍스트 그대로 노출
  - `credit` → raw 텍스트 그대로 노출
- `change_hospital_plan` RPC의 description이 `'사용자 플랜 변경'`으로만 기록 → 업그레이드/다운그레이드 구분 불가
- 어드민 패널 결제내역 테이블에 description 컬럼이 없음 (payment_ref 없을 때만 fallback으로 표시)

### 영향 범위
- 운영자가 어드민 패널에서 결제내역 조회 시 `plan_change`, `admin_manual` raw 문자 노출
- 업그레이드 vs 다운그레이드 구분 불가 → 운영 추적 어려움

## 변경 범위

### 1. AdminPanel.tsx — PAYMENT_METHOD_LABELS 보완
```ts
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card:         '신용카드',
  transfer:     '계좌이체',
  free:         '무료',
  trial:        '체험',
  credit:       '크레딧',
  plan_change:  '플랜 변경',
  admin_manual: '어드민 수동',
};
```

### 2. AdminPanel.tsx — description 컬럼 추가
현재 테이블에 `description`이 숨겨져 있음. "비고" 컬럼을 추가해 description을 표시한다.
- `payment_ref`가 있는 경우: 결제 참조번호 (기존 유지)
- `description`이 있는 경우: 비고란에 표시
- 두 컬럼 분리 또는 "참조/비고" 통합 컬럼 — 통합이 더 간결

### 3. change_hospital_plan RPC — description 개선
업그레이드/다운그레이드를 `PLAN_ORDER` 기준으로 판별하여 description에 기록.

현재 플랜을 hospitals 테이블에서 조회한 뒤:
- 새 플랜이 더 높음 → `'업그레이드: {현재플랜} → {새플랜}'`
- 새 플랜이 더 낮음 → `'다운그레이드: {현재플랜} → {새플랜}'`
- 동일 플랜 → `'플랜 변경: {플랜}'` (사이클 전환 등)
- admin 경우 → `'어드민 처리: {현재플랜} → {새플랜}'`

plan_order 하드코딩: free=0, basic=1, plus=2, business=3, ultimate=4

## 변경하지 않는 것 (의도적)
- `billing_history` 스키마 변경 없음 (description 컬럼 이미 존재)
- `toss-payment-confirm` Edge Function 변경 없음 (카드 결제는 이미 `card` 라벨 정상)
- `process_credit_payment` 변경 없음
- DB 마이그레이션 최소화 — `change_hospital_plan` 재정의만 추가

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `components/AdminPanel.tsx` | PAYMENT_METHOD_LABELS 보완, description 컬럼 추가 |
| `supabase/migrations/YYYYMMDDHHMMSS_change_hospital_plan_description.sql` | change_hospital_plan description 업/다운 구분 |

## 검증 방법
1. 어드민 패널 > 결제 탭에서 `plan_change` 행 → "플랜 변경" 한글 표시 확인
2. `admin_manual` 행 → "어드민 수동" 표시 확인
3. 업그레이드 실행 후 → `'업그레이드: free → basic'` description 확인
4. 다운그레이드 실행 후 → `'다운그레이드: plus → basic'` description 확인

## 우선순위
- P0 (즉시): `PAYMENT_METHOD_LABELS` 보완 (1줄 변경, 즉시 배포 가능)
- P1: `change_hospital_plan` description 개선 (DB 마이그레이션 필요)
- P1: AdminPanel description 컬럼 추가

## 예상 작업량
- 소규모: 파일 2개, 마이그레이션 1개
- 테스트: verify:premerge 기존 통과 확인
