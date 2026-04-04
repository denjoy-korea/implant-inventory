# Plan: credit-system-remodel

## 개요

**목표**: 현재 임플란트 재고관리 플랜 업/다운그레이드 보상에만 국한된 크레딧 시스템을, DenJOY 플랫폼 전체에서 통용되는 **범용 크레딧 통화**로 리모델링한다.

**배경**: DenJOY는 임플란트 재고관리 SaaS 단일 제품에서 강의·컨설팅·솔루션을 아우르는 멀티서비스 플랫폼으로 성장 중이다. 현재 크레딧은 `hospitals.credit_balance` 에 담긴 "플랜 보상 크레딧"에 불과하고, 최상위 홈페이지/MyPage에서 크레딧을 인지하거나 활용하는 경로가 없다. 플랫폼 전체의 결제 마찰을 줄이고, 사용자 리텐션을 높이기 위해 크레딧을 플랫폼 통화로 격상한다.

**현재 상태 진단**:

| 항목 | 현재 | 문제 |
|------|------|------|
| 크레딧 위치 | `hospitals.credit_balance` | 병원(B2B) 단위, 강의(B2C) 개인 사용 불가 |
| 크레딧 적립 경로 | 플랜 다운/업그레이드 보상만 | 강의 구매 보너스, 추천 보상 없음 |
| 크레딧 사용처 | 임플란트 재고관리 플랜 결제에만 | 강의·신규 서비스 사용 불가 |
| 크레딧 표시 위치 | UserProfile 모달 한 곳 | MyPage 홈·헤더 등 최상위 노출 없음 |
| 강의 결제 | 전액 TossPayments 현금 | 크레딧 부분/전액 사용 불가 |

---

## 핵심 설계 결정

### 크레딧 레벨: 병원 vs 개인

| 크레딧 종류 | 저장 위치 | 용도 | 변경 여부 |
|------------|----------|------|----------|
| **병원 크레딧** | `hospitals.credit_balance` | B2B 플랜 업/다운그레이드 보상 → 임플란트 재고관리 플랜 결제 | 유지 (기존 RPC 호환) |
| **개인 크레딧 (신규)** | `profiles.credit_balance` | 강의 구매, B2C 서비스, 이벤트/추천 보상 | 신규 추가 |

- 병원 크레딧과 개인 크레딧은 **별개**로 관리한다. 용도 혼용 금지.
- MyPage에서는 두 잔액을 각각 표시하되, 현재 컨텍스트에 맞는 잔액을 먼저 강조한다.

### 크레딧 적립 경로 (신규 포함)

| 경로 | 대상 크레딧 | 금액/조건 | 우선순위 |
|------|-----------|---------|---------|
| 플랜 다운/업그레이드 보상 | 병원 | 기존 일할 계산 그대로 | 유지 |
| 강의 첫 구매 보너스 | 개인 | 구매금액의 10% | P1 |
| 추천인 보상 | 개인 | 피추천인 첫 결제의 5% | P2 |
| 관리자 수동 지급 | 개인/병원 | 이벤트·CS 처리용 | P2 |
| 회원가입 환영 크레딧 | 개인 | 5,000원 고정 (선택) | P3 |

### 크레딧 사용처 (신규 포함)

| 사용처 | 대상 크레딧 | 처리 방식 | 우선순위 |
|-------|-----------|---------|---------|
| 임플란트 재고관리 플랜 결제 | 병원 | 기존 `process_payment_callback` | 유지 |
| 강의 시즌 구매 (부분 차감) | 개인 | 크레딧 차감 후 잔액을 TossPayments | P1 |
| 강의 시즌 구매 (전액 차감) | 개인 | 크레딧만으로 완결, TossPayments 생략 | P1 |
| 신규 서비스 구독 결제 | 병원/개인 | 향후 Phase 3에서 확장 | P3 |

---

## 구현 범위 (In Scope)

### Phase 1 — DB & 백엔드 기반 (필수)
- `profiles` 테이블에 `credit_balance NUMERIC DEFAULT 0` 컬럼 추가
- `user_credit_transactions` 테이블 신설
  - 컬럼: `id, user_id, amount, balance_after, type('earn'|'spend'), source, reference_id, memo, created_at`
  - `type='earn'`: 강의구매보너스, 추천보상, 관리자지급, 환영크레딧
  - `type='spend'`: 강의결제, 서비스결제
- RPC 신설:
  - `earn_user_credit(user_id, amount, source, reference_id, memo)` — 적립 (SECURITY DEFINER)
  - `spend_user_credit(user_id, amount, source, reference_id)` — 사용 (잔액 검증 포함, race-condition safe)
  - `get_user_credit_balance(user_id)` → `NUMERIC`
- `toss-payment-confirm` Edge Function 수정:
  - 강의(`service_purchase`) 결제 시 `credit_used_amount > 0` 이면 `spend_user_credit` 호출
  - 강의 첫 구매 보너스: `earn_user_credit` 호출 (구매금액의 10%)
- RLS: `user_credit_transactions`는 본인 행만 SELECT 가능, INSERT는 SECURITY DEFINER RPC만

### Phase 2 — MyPage 크레딧 월렛 UI (필수)
- **MyPage 홈 탭**: 크레딧 요약 카드 추가
  - 개인 크레딧 잔액 (대형 숫자)
  - 병원 크레딧 잔액 (서브)
  - "크레딧 내역 보기" 링크
- **MyPage 구매내역 탭 또는 신규 탭**: 크레딧 적립/사용 내역 테이블
  - 날짜, 내용, 금액(+/-), 잔액
- **MyPage 헤더/배지**: 개인 크레딧 잔액을 뱃지로 표시 (로그인 후)
- `profileService` 또는 `creditService` 신설: `getUserCreditBalance()`, `getUserCreditHistory()`

### Phase 3 — 강의 결제 크레딧 연동 (필수)
- **강의 장바구니 (`MyPage → 서비스 탭`)** 수정:
  - 보유 개인 크레딧 잔액 표시
  - "크레딧 사용" 토글 (최대 = 보유 잔액 or 결제금액 중 작은 값)
  - 크레딧 차감 후 실결제금액 자동 계산
  - 실결제금액 = 0인 경우 TossPayments 생략하고 직접 `spend_user_credit` + `process_course_enrollment`
- `toss-payment-confirm` Edge Function:
  - `credit_used_amount` 파라미터 수신 및 서버 측 재검증
  - 결제 완료 후 크레딧 차감 순서 보장 (idempotent)

### Phase 4 — 홈페이지 통합 (선택)
- **HomepageHeader**: 로그인 상태 시 개인 크레딧 배지 표시
- **CoursesPage 강의 상세**: 크레딧 사용 가능 안내 배너
- **HomepageHero / PricingPage**: "크레딧으로 시작해보세요" 온보딩 메시지

---

## 구현 제외 (Out of Scope)

- 크레딧 현금 환불 (크레딧 → 은행 계좌)
- 크레딧 사용자 간 전송/선물
- 크레딧 소멸 기한 (추후 검토)
- 병원 크레딧 ↔ 개인 크레딧 전환

---

## 의존성 & 기술 검토

| 항목 | 현황 | 검토 사항 |
|------|------|---------|
| `profiles` 테이블 | `get_my_profile` RPC 사용, RLS 있음 | 컬럼 추가 시 RPC 수정 필요 |
| `toss-payment-confirm` | `--no-verify-jwt` 필수 | 크레딧 로직 추가 후 재배포 시 플래그 유지 |
| `hospitals.credit_balance` | 기존 `process_payment_callback`에서 사용 | 변경 없이 유지, 신규 RPC와 충돌 없음 |
| `course_enrollments` | season_id + user_id unique | 크레딧 결제 후 enrollment 생성 순서 중요 |
| Race condition | `spend_user_credit` 동시 호출 위험 | Postgres row-level lock (`FOR UPDATE`) 필수 |

---

## 파일 영향 범위

**신규 생성**:
- `supabase/migrations/YYYYMMDD_user_credit_system.sql`
- `services/creditService.ts`

**수정 필요**:
- `supabase/functions/toss-payment-confirm/index.ts` — 크레딧 차감 로직
- `types/plan.ts` 또는 `types/credit.ts` — 크레딧 관련 타입
- `components/MyPage.tsx` — 크레딧 월렛 UI, 강의 장바구니 크레딧 토글
- `services/authService.ts` → `getProfileById` — credit_balance 포함 반환
- `hooks/useAppHospitalDataLoader.ts` 또는 새 훅 — 개인 크레딧 상태 관리

**참조 파일**:
- `supabase/migrations/20260311110000_downgrade_credit.sql` — 병원 크레딧 패턴 참고
- `supabase/migrations/20260404200000_course_replay_system.sql` — enrollment 패턴 참고
- `supabase/functions/toss-payment-confirm/index.ts` — 결제 완료 흐름

---

## 성공 지표

| 지표 | 목표 |
|------|------|
| 강의 구매 시 크레딧 사용 전환율 | 구매자 중 30% 이상 크레딧 사용 |
| MyPage 크레딧 배지 클릭률 | 월 활성 사용자의 20% 이상 |
| 플랜 다운그레이드 후 크레딧 재사용률 | 다운그레이드 병원 중 50% 이상 재결제 |
| 강의 첫 구매 보너스 크레딧 사용률 | 보너스 지급 후 90일 내 60% 소진 |

---

## 구현 우선순위

```
P0 (필수·즉시): Phase 1 DB 기반 + Phase 2 UI
P1 (필수·다음): Phase 3 강의 결제 연동
P2 (권장): Phase 1 추천 보상 + Phase 4 홈페이지 통합
P3 (선택): 환영 크레딧, 소멸 기한
```
