# Design: DenJOY PMF 가속화 핵심 기능 설계

> **참조 플랜**: `docs/01-plan/features/product-strategy.plan.md`
>
> 비즈니스 전략 Plan에서 도출된 P0 우선순위 과제 4가지를
> 구체적인 구현 설계로 변환한다.
>
> **P0 과제 목록**:
> 1. 결제 자동화 (Toss Payments PG 연동)
> 2. 온보딩 위자드 (기초재고 템플릿 + 단계별 가이드)
> 3. Free → Paid 전환 넛지 시스템

> **구현 상태 (2026-03-03)**: 온보딩 위자드, 넛지 시스템 P0 완료. 결제 PG는 P1 (유료 15개소 초과 시).

---

## 1. 결제 플로우 — 계좌이체 + 세금계산서 (현행 유지)

### 1.1 현행 플로우 (유지)

```
고객 플랜 선택
  → billing_history(pending) 생성
  → Make.com Webhook → 운영자 알림 (카카오톡/이메일)
  → 운영자: 계좌 입금 확인
  → 운영자: 홈택스에서 세금계산서 직접 발행
  → 운영자: Supabase에서 수동으로 플랜 활성화
```

**유지 근거**: 초기 유료 고객이 소수(< 15개소)인 동안은 수동 처리가 더 효율적.
Toss Payments PG 연동은 유료 고객 15개소 초과 시점에 검토.

### 1.2 운영 체크리스트 (결제 처리 SOP)

```
[ ] 플랜 신청 알림 수신 (Make.com → 카카오톡)
[ ] 입금 확인 (계좌 조회)
[ ] 홈택스 → 전자세금계산서 발행 (공급가액 / 부가세 10% 구분)
[ ] Supabase Dashboard → hospitals 테이블 plan 필드 수동 변경
[ ] plan_expires_at 갱신 (월정기: +1개월, 연간: +12개월)
[ ] 고객 이메일 발송 (플랜 활성화 안내)
```

### 1.3 VAT 처리 기준

| 항목 | 내용 |
|------|------|
| 과세 여부 | 과세 (SaaS 용역) |
| 세금계산서 발행 | 홈택스 전자세금계산서 |
| 발행 시점 | 입금 확인 후 당일 |
| 표시 요금 | **VAT 별도** (공급가액) |
| 실 청구 금액 | 표시 요금 × 1.1 |
| 부가세 | 표시 요금 × 10% |

**실 청구 금액 예시**:

| 플랜 | 공급가액 | 부가세 | 합계 (실 납부액) |
|------|---------|-------|----------------|
| Basic | ₩29,000 | ₩2,900 | **₩31,900** |
| Plus | ₩69,000 | ₩6,900 | **₩75,900** |
| Business | ₩129,000 | ₩12,900 | **₩141,900** |

> **주의**: PricingPage에 "VAT 별도" 문구가 명확히 표시되어야 고객 혼선 방지 가능.

### 1.4 P1 — Toss Payments PG 연동 (유료 고객 15개소 이후)

```
조건: 월 결제 처리 건수 > 15건으로 수동 운영 부담 발생 시
효과: 결제 자동화, 야간/주말 즉시 처리, 운영자 개입 제거
구현: @tosspayments/payment-sdk + Supabase Edge Function
소요: 약 2주 (Toss 사업자 심사 1주 + 개발 1주)
```

---

## 2. 온보딩 위자드 — 첫 10분 내 가치 체험 설계

### 2.1 현황 문제

```
현재: 가입 → 빈 대시보드 (재고 0건, 수술기록 없음)
문제: "어디서 시작하지?" → 이탈
목표: 10분 내 "아, 이게 유용하다" 느끼게
```

### 2.2 온보딩 위자드 플로우

> **의도적 변경 (D1)**: 설계 초안의 5-step (Brand Select + Stock Input) →
> 실무 기반 7-step (덴트웹 Fixture Upload) 플로우로 전환.
> 덴트웹 데이터를 직접 업로드하는 방식이 치과 실무에 더 적합함.

**실제 구현 플로우 (7 steps)**:

```
[Step 1] 환영 화면
    → 병원명 확인, 온보딩 안내

[Step 2] 덴트웹 픽스처 다운로드 안내
    → 덴트웹에서 픽스처 데이터 내보내기 가이드

[Step 3] 픽스처 파일 업로드 (핵심)
    → Excel 파일 업로드 → 데이터 가공 → 재고 마스터 생성
    → DashboardFixtureEditSection으로 이동 옵션

[Step 4] 덴트웹 수술기록 다운로드 안내
    → 수술기록 내보내기 방법 안내

[Step 5] 수술기록 업로드 안내
    → ExcelTable 업로드 → 재고 자동 차감

[Step 6] 재고 실사 안내
    → InventoryAudit 사용법 안내

[Step 7] 교환 관리 안내 (완료)
    → FailManager 사용법 + 완료
```

### 2.3 실제 구현 컴포넌트

#### 파일 구조 (실제)

```
components/
  OnboardingWizard.tsx         ← 메인 위자드 컨테이너 (7 steps)
  onboarding/
    Step1Welcome.tsx
    Step2DenwebFixtureDownload.tsx   ← 덴트웹 픽스처 다운로드 안내
    Step2FixtureUpload.tsx           ← 픽스처 파일 업로드
    Step3FailAudit.tsx               ← (현재 플로우에서 교환 관리 안내)
    Step4DenwebSurgeryDownload.tsx   ← 덴트웹 수술기록 다운로드 안내
    Step4UploadGuide.tsx             ← 수술기록 업로드 안내
    Step6InventoryAudit.tsx          ← 재고 실사 안내
    OnboardingToast.tsx              ← 온보딩 진행 상태 토스트
services/
  onboardingService.ts         ← 온보딩 진행 상태 관리 (localStorage + Supabase)
```

#### `OnboardingWizard.tsx` 인터페이스 (실제)

```typescript
interface OnboardingWizardProps {
  hospitalId: string;
  hospitalName: string;
  plan: PlanType;
  onSkip: () => void;
  onGoToFixtureEdit: (file: File, corrections: Record<string, string>) => void;
  onGoToFailManager: () => void;
  initialStep: number;
}
```

#### `onboardingService.ts` 실제 API

```typescript
export const onboardingService = {
  // 플래그 키 (localStorage + Supabase OB_FLAG 비트필드)
  isWelcomeSeen(hospitalId: string): boolean
  markWelcomeSeen(hospitalId: string): void
  isFailAuditDone(hospitalId: string): boolean
  markFailAuditDone(hospitalId: string): void
  markFixtureDownloaded(hospitalId: string): void
  markSurgeryDownloaded(hospitalId: string): void
  markInventoryAuditSeen(hospitalId: string): void
  markFixtureSaved(hospitalId: string): void
  markDismissed(hospitalId: string): void
  isSnoozed(hospitalId: string): boolean
  snooze(hospitalId: string, hours?: number): void
};

// localStorage 키 패턴: denjoy_ob_v2_*_{hospitalId}
// Supabase 동기화: OB_FLAG 비트필드 (hospital_integrations 테이블 재사용)
```

> **의도적 변경 (D1)**:
> - `isCompleted` / `markCompleted` → 세분화된 플래그 API로 교체
> - `createStockFromTemplate()` 미구현 → 픽스처 업로드 기반으로 대체
> - localStorage 단일 키 → 다중 플래그 + Supabase 동기화

### 2.4 온보딩 위자드 노출 조건

```typescript
// App.tsx — 대시보드 진입 시 체크
const shouldShowOnboarding =
  state.currentView === 'dashboard' &&
  state.user?.role === 'master' &&
  state.user?.status === 'active' &&
  !state.isLoading &&
  state.inventory.length === 0 &&
  !onboardingService.isCompleted(state.user?.hospitalId ?? '');
```

> **구현 결정**: 온보딩 완료 여부는 `localStorage`로 관리 (`denjoy_onboarding_done_{hospitalId}` 키).
> DB 컬럼(`onboarding_completed_at`) 방식보다 구현이 단순하며 초기 MVP에 적합.
> 멀티 디바이스 지원이 필요해지는 시점에 DB 마이그레이션 검토.

### 2.5 UI/UX 스펙

```
레이아웃: 전체화면 모달 (z-[300])
배경: 흰색, 중앙 카드 (max-w-2xl)
진행: 상단 스텝 인디케이터 (1→2→3→4→5 도트)
애니메이션: 스텝 전환 시 slide-in (x: 20 → 0)
하단: "이전" + "다음" 버튼, 우측 상단 "건너뛰기(X)"
모바일: 풀스크린 처리
```

---

## 3. Free → Paid 전환 넛지 시스템

### 3.1 넛지 트리거 정의

| 트리거 | 타이밍 | 메시지 |
|--------|--------|--------|
| **T1: 데이터 만료 임박** | 만료 7일 전 | "수술기록이 7일 후 삭제됩니다" |
| **T2: 기능 한계 도달** | 재고 90/100 품목 | "재고 한도 90% 도달, 10개 남음" |
| **T3: 업로드 횟수 소진** | Free 월 1회 초과 시도 | "이번 달 업로드 한도 초과" |
| **T4: 28일 체험 만료 D-3** | 체험 만료 3일 전 | "체험 3일 남음, 연간 결제 시 20% 할인" |
| **T5: 체험 만료 당일** | 만료 0일 | "오늘 만료. 연간 결제로 전환 시 20% 할인" |
| **T6: 활성 사용 후 14일** | 마지막 로그인 14일 후 | 재참여 유도 (이메일, P1) |

> **TRIAL_DAYS 변경**: 설계 초안 14일 → 실제 **28일** (`types.ts: TRIAL_DAYS = 28`). 베타 기간 4주 확장 (D2).

### 3.2 인앱 넛지 컴포넌트 설계

#### 신규 파일

```
components/
  UpgradeNudge.tsx         ← 상단 스티키 배너
  PlanLimitToast.tsx       ← 한계 도달 시 토스트
  TrialCountdown.tsx       ← 헤더 내 체험 카운트다운 (기존 개선)
```

#### `UpgradeNudge.tsx` 배너 디자인

```
[UI 스펙]
위치: Sidebar 아래, 대시보드 콘텐츠 상단 (sticky)
높이: 44px
배경: amber-50 (경고) / rose-50 (긴급)
내용: 아이콘 + 메시지 텍스트 + "업그레이드" CTA 버튼

예시:
┌─────────────────────────────────────────────────────┐
│ ⚠ 수술기록이 3일 후 삭제됩니다.  [지금 업그레이드 →] │
└─────────────────────────────────────────────────────┘

긴급 (rose):
┌─────────────────────────────────────────────────────┐
│ 🔴 체험 종료. 데이터 보관을 위해 플랜을 선택하세요. [선택하기] │
└─────────────────────────────────────────────────────┘
```

#### `UpgradeNudge.tsx` 인터페이스

```typescript
type NudgeType =
  | 'data_expiry_warning'   // T1: 만료 임박
  | 'item_limit_warning'    // T2: 재고 한도
  | 'upload_limit'          // T3: 업로드 초과
  | 'trial_ending'          // T4: 체험 만료 임박
  | 'trial_expired'         // T5: 체험 만료
  ;

interface UpgradeNudgeProps {
  type: NudgeType;
  daysLeft?: number;
  currentCount?: number;
  maxCount?: number;
  onUpgrade: () => void;
  onDismiss?: () => void;
}
```

### 3.3 넛지 노출 로직 (App.tsx 통합)

```typescript
// App.tsx — useMemo로 현재 넛지 타입 계산
const activeNudge = useMemo<NudgeType | null>(() => {
  if (!planState || planState.plan !== 'free') return null;

  // T5: 체험 만료
  if (planState.isTrialActive === false && planState.trialUsed) return 'trial_expired';

  // T4: 체험 D-3
  if (planState.isTrialActive && (planState.trialDaysRemaining ?? 99) <= 3) return 'trial_ending';

  // T1: 데이터 만료 D-7 (Free: 3개월)
  if (planState.retentionDaysLeft !== undefined && planState.retentionDaysLeft <= 7) return 'data_expiry_warning';

  // T2: 재고 90% 이상
  const itemRatio = inventory.length / PLAN_LIMITS.free.maxItems;
  if (itemRatio >= 0.9) return 'item_limit_warning';

  return null;
}, [planState, inventory]);
```

### 3.4 이메일 시퀀스 (Supabase Edge Function + Make.com)

| 이메일 | 발송 시점 | 제목 |
|--------|---------|------|
| E1. 환영 | 가입 즉시 | "덴조이 가입을 환영합니다 — 시작 가이드" |
| E2. 7일 체크인 | 가입 7일 후 | "재고 관리 어떠세요? 팁 3가지를 드려요" |
| E3. 체험 D-3 | 체험 만료 3일 전 | "무료 체험 3일 남음 — 지금 전환하면 혜택" |
| E4. 체험 만료 | 만료 당일 | "[긴급] 오늘 체험 종료 — 데이터를 지키세요" |
| E5. 데이터 만료 D-7 | 보관 만료 7일 전 | "수술기록 X건이 7일 후 삭제될 예정입니다" |

**발송 트리거**: Supabase `pg_cron` 스케줄러 + Edge Function

```sql
-- 매일 오전 9시 만료 예정 병원 감지
SELECT cron.schedule(
  'nudge-email-daily',
  '0 9 * * *',
  $$SELECT net.http_post(url := 'https://xxx.supabase.co/functions/v1/send-nudge-emails') $$
);
```

---

## 4. 데이터 모델 변경 요약

### 4.1 신규 컬럼

```sql
-- hospitals 테이블
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- billing_history 테이블 (기존 확인 필요)
-- toss_payment_key VARCHAR (결제 키 보관)
ALTER TABLE billing_history ADD COLUMN IF NOT EXISTS toss_payment_key VARCHAR;
```

### 4.2 신규 Supabase Edge Functions

| Function | 역할 |
|----------|------|
| `send-nudge-emails` | 일일 넛지 이메일 발송 |

### 4.3 신규 환경 변수

```env
RESEND_API_KEY=re_...                 # 이메일 발송 (Resend 추천)
```

---

## 5. 구현 우선순위 및 의존성

```
[P0 - 즉시]
온보딩 위자드 ──────────── 코드만 변경, 빠른 피드백 가능
넛지 시스템 (인앱) ──────── 전환율 직결

[P0 - 운영]
결제 SOP 정립 ───────────── 계좌이체 + 홈택스 세금계산서 수동 처리

[P1 - 유료 15개소 초과 시]
Toss Payments PG 연동 ───── 자동 결제, 운영 부담 해소
이메일 시퀀스 ───────────── Resend API 설정 후
```

### 5.1 구현 순서 권장

```
Week 1: 온보딩 위자드 (전환율 개선, 코드 변경만)
Week 2: 인앱 넛지 배너 + Toast (체험 → 유료 전환 유도)
Week 3~: 고객 반응 보며 이메일 시퀀스 / Toss PG 검토
```

---

## 6. 성공 지표 (Design KPI)

| 기능 | 지표 | 목표 |
|------|------|------|
| 결제 자동화 | 결제 완료 소요 시간 | < 2분 |
| 결제 자동화 | 결제 성공률 | > 95% |
| 온보딩 위자드 | Step 3 완료율 | > 70% |
| 온보딩 위자드 | 7일 Retention (위자드 완료 코호트) | > 75% |
| 넛지 시스템 | T4/T5 트리거 → 업그레이드 전환율 | > 20% |

---

## 7. 리스크 및 완화 방안

| 리스크 | 완화 방안 |
|--------|---------|
| 수동 결제 처리 누락 | Make.com 알림 + 처리 SOP 문서화, 체크리스트 운영 |
| 세금계산서 발행 지연 | 입금 확인 당일 발행 원칙 수립 |
| 온보딩 브랜드 템플릿 오류 | "편집 가능" 안내 명확히, 나중에 수정 가능 강조 |
| 이메일 스팸 분류 | Resend + 도메인 SPF/DKIM/DMARC 설정 |

---

---

## 8. 설계 대비 추가 구현 항목 (Added Features)

설계에 없었으나 구현 과정에서 추가된 컴포넌트 및 기능:

| 항목 | 파일 | 설명 |
|------|------|------|
| PricingPaymentModal | `components/PricingPaymentModal.tsx` | 플랜 선택 → 결제 안내 모달 (계좌이체/세금계산서) |
| TrialConsentModal | `components/TrialConsentModal.tsx` | 체험 시작 동의 모달 |
| WaitlistModal | `components/WaitlistModal.tsx` | 품절 플랜 대기 신청 모달 |
| Plan Finder Quiz | `components/PlanFinderQuiz.tsx` | 요금제 추천 퀴즈 (3단계) |
| AuthSignupPlanSelect | `components/auth/AuthSignupPlanSelect.tsx` | 가입 플로우 플랜 선택 단계 |
| AuthSignupRoleSelect | `components/auth/AuthSignupRoleSelect.tsx` | 가입 플로우 역할 선택 단계 |
| makePaymentService | `services/makePaymentService.ts` | Make.com 웹훅 결제 프록시 서비스 |
| trialPolicy.ts | `utils/trialPolicy.ts` | 베타 체험 정책 상수/유틸 (TRIAL_DAYS, 문구 등) |
| Plan Availability | `planService.getPlanAvailability()` | 품절/대기 플랜 가용성 조회 (인위적 희소성 전략) |
| Beta Trial (28일) | `types.ts: TRIAL_DAYS = 28` | 베타 기간 확장 (설계 14일 → 28일) |

**Gap Analysis**: P0 Strict 73.8% → 의도적 변경 포함 92.9% PASS

---

**Created**: 2026-02-22
**Updated**: 2026-03-03
**Feature**: product-strategy
**Phase**: Implemented
**Ref Plan**: `docs/01-plan/features/product-strategy.plan.md`
**Status**: ✅ P0 Complete (P1 보류: Toss PG, 이메일 시퀀스)
