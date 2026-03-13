# Design: admin-billing-labels

## 변경 파일 목록

| 파일 | 역할 |
|------|------|
| `components/AdminPanel.tsx` | 결제수단 라벨 보완 + 비고 컬럼 추가 |
| `supabase/migrations/20260312240000_change_hospital_plan_description.sql` | change_hospital_plan description 개선 |

---

## 1. AdminPanel.tsx

### 1-1. PAYMENT_METHOD_LABELS 보완

**현재 (line 28)**:
```ts
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: '신용카드',
  transfer: '계좌이체',
  free: '무료',
  trial: '체험',
};
```

**변경 후**:
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

- `card`: 카드 결제 (toss-payment-confirm)
- `credit`: 크레딧 전액 결제 (process_credit_payment)
- `plan_change`: 사용자 직접 플랜 변경 (change_hospital_plan)
- `admin_manual`: 어드민 수동 플랜 처리 (change_hospital_plan, role=admin)

### 1-2. 결제 테이블 — "비고" 컬럼 추가

**현재 테이블 헤더 (8컬럼)**:
```
병원 | 플랜 | 주기 | 결제 수단 | 금액 | 상태 | 결제 참조번호 | 일시
```

**변경 후 (9컬럼)**:
```
병원 | 플랜 | 주기 | 결제 수단 | 금액 | 상태 | 참조번호 | 비고 | 일시
```

- "결제 참조번호" → "참조번호" (헤더 축약)
- "비고" 컬럼 신규 추가: `row.description` 표시
  - description이 없으면 `-` 표시
  - description이 길면 `title` 속성으로 full text 제공, 화면에는 최대 20자 truncate
- `payment_ref` 없을 때 description을 fallback으로 쓰던 방식 → 두 컬럼 완전 분리

**셀 렌더링 (비고 컬럼)**:
```tsx
<td className="px-5 py-3 text-xs text-slate-400 max-w-[120px]">
  {row.description ? (
    <span title={row.description} className="truncate block">
      {row.description.length > 20
        ? row.description.slice(0, 20) + '…'
        : row.description}
    </span>
  ) : '-'}
</td>
```

**셀 렌더링 (참조번호 컬럼) — fallback 제거**:
```tsx
<td className="px-5 py-3 text-xs text-slate-400 font-mono">
  {row.payment_ref ? (
    <span title={row.payment_ref}>
      {row.payment_ref.slice(0, 16)}{row.payment_ref.length > 16 ? '…' : ''}
    </span>
  ) : '-'}
</td>
```

---

## 2. DB 마이그레이션 — change_hospital_plan description 개선

**파일**: `supabase/migrations/20260312240000_change_hospital_plan_description.sql`

### 변경 전 description 로직
```sql
IF v_role = 'admin' THEN
  v_description := '플랜 변경 신청 처리';
ELSE
  v_description := '사용자 플랜 변경';
END IF;
```

### 변경 후 description 로직

현재 플랜(`v_current_plan`)을 hospitals에서 조회한 뒤 PLAN_ORDER 기준으로 업/다운 판별:

```sql
-- plan 순서 (integer 비교)
DECLARE
  v_current_plan TEXT;
  v_direction    TEXT;
  v_plan_order   RECORD;
  v_old_rank     INTEGER;
  v_new_rank     INTEGER;
```

plan_order 인라인 정의:
```sql
-- free=0, basic=1, plus=2, business=3, ultimate=4
v_old_rank := CASE v_current_plan
  WHEN 'free'     THEN 0
  WHEN 'basic'    THEN 1
  WHEN 'plus'     THEN 2
  WHEN 'business' THEN 3
  WHEN 'ultimate' THEN 4
  ELSE 0
END;

v_new_rank := CASE p_plan
  WHEN 'free'     THEN 0
  WHEN 'basic'    THEN 1
  WHEN 'plus'     THEN 2
  WHEN 'business' THEN 3
  WHEN 'ultimate' THEN 4
  ELSE 0
END;

IF v_new_rank > v_old_rank THEN
  v_direction := '업그레이드';
ELSIF v_new_rank < v_old_rank THEN
  v_direction := '다운그레이드';
ELSE
  v_direction := '플랜 변경';  -- 동일 플랜(사이클 전환 등)
END IF;
```

description 조합:
```sql
IF v_role = 'admin' THEN
  v_description := '어드민 처리: ' || COALESCE(v_current_plan, '?') || ' → ' || p_plan;
ELSE
  v_description := v_direction || ': ' || COALESCE(v_current_plan, '?') || ' → ' || p_plan;
END IF;
```

**예시 결과**:
- `'업그레이드: free → basic'`
- `'다운그레이드: plus → basic'`
- `'플랜 변경: basic → basic'` (사이클 전환)
- `'어드민 처리: plus → business'`

### 전체 마이그레이션 구조
- `CREATE OR REPLACE FUNCTION change_hospital_plan(...)` 로 전체 재정의
- 기존 로직(소유권 검증, 플랜 유효성, billing_history INSERT) 그대로 유지
- 변경점: `SELECT plan INTO v_current_plan FROM hospitals WHERE id = p_hospital_id` 추가 (UPDATE 전)
- `v_direction` 계산 후 description에 반영

---

## 데이터 흐름

```
사용자/어드민이 플랜 변경 → change_hospital_plan RPC
  → hospitals.plan 조회 (현재 플랜)
  → 업/다운/동일 판별
  → hospitals UPDATE
  → billing_history INSERT
      payment_method: 'plan_change' | 'admin_manual'
      description: '업그레이드: free → basic'

AdminPanel > 결제 탭
  → billing_history SELECT *
  → PAYMENT_METHOD_LABELS['plan_change'] → '플랜 변경' (한글)
  → description 컬럼 → '업그레이드: free → basic'
```

---

## 검증 포인트

| # | 검증 항목 | 기대값 |
|---|-----------|--------|
| 1 | admin_manual 행 결제수단 | "어드민 수동" |
| 2 | plan_change 행 결제수단 | "플랜 변경" |
| 3 | credit 행 결제수단 | "크레딧" |
| 4 | 업그레이드 후 비고 | "업그레이드: free → basic" |
| 5 | 다운그레이드 후 비고 | "다운그레이드: plus → basic" |
| 6 | 어드민 변경 후 비고 | "어드민 처리: plus → business" |
| 7 | payment_ref 있는 카드 결제 | 참조번호 컬럼에 ref, 비고에 '-' |
| 8 | description 20자 초과 | truncate + title hover |

---

## 의존성

- `types/plan.ts` `DbBillingHistory.description` 컬럼: 이미 존재 (nullable string)
- `PLAN_ORDER` 상수: DB에서는 CASE 인라인 사용 (import 불필요)
- `change_hospital_plan` 기존 시그니처 변경 없음 (`p_hospital_id`, `p_plan`, `p_billing_cycle`)
