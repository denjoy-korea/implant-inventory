# pricing-strategy-redesign Completion Report

> **Summary**: 치과 임플란트 재고관리 SaaS(DenJOY)의 요금제 차별화 전략 재설계 완료.
> Free-Basic 기능 동일 문제를 해소하고, 5개 플랜에 심리적으로 강력한 킬러 피처를 재배치하였다.
>
> **Author**: report-generator Agent
> **Created**: 2026-03-05
> **Feature**: pricing-strategy-redesign
> **Status**: Completed
> **Match Rate**: 100% (24/24 PASS)

---

## 1. Executive Summary

### 1.1 배경 및 목적

출시 8일차(2026-02-25 출시) DenJOY의 요금제는 구조적 결함을 내포하고 있었다.
가장 심각한 문제는 Basic(29,000원)이 Free와 사실상 동일한 기능을 제공하여 유료 전환 동기가 없었던 점이다.
이 PDCA는 Free → 유료 전환율을 개선하기 위한 요금제 차별화 전략 전면 재설계 작업이다.

### 1.2 핵심 성과

| 지표 | 변경 전 | 변경 후 |
|------|---------|---------|
| Free-Basic 기능 차이 | 없음 (품목 수·사용자만 차이) | 킬러 피처 3개 추가 (FAIL·발주·실사) |
| Basic maxUsers | 3명 | 1명 ("혼자 쓰는 병원" 명확화) |
| Basic maxBaseStockEdits | 5회 | 무제한 |
| Basic retentionMonths | 6개월 | 12개월 |
| Plus retentionMonths | 12개월 | 24개월 |
| Edge Function 멤버 제한 | 하드코딩 5명 | 플랜별 동적 적용 |
| Feature Discovery | 없음 | FAIL 탭 샘플 데이터 1회 미리보기 |
| UpgradeModal | 일반 메시지 | 기능별 절감 비용 맞춤 문구 |

---

## 2. 구현 완료 항목

### 2.1 Must Requirements (5/5)

| ID | 요구사항 | 구현 결과 |
|----|----------|-----------|
| R-01 | brand_analytics Free 제거 → Basic 이상 | `types/plan.ts:102` Free features에서 제거, `types/plan.ts:111` Basic에 추가 |
| R-02 | Free maxItems 100 → 50 | `types/plan.ts:98` `maxItems: 50` |
| R-03 | PlanFeature에 fail_management, order_execution, audit_history 추가 | `types/plan.ts:18-21` 3개 식별자 추가 (`inventory_audit` 포함 4개) |
| R-04 | FailManager FeatureGate(fail_management) 적용 | `DashboardOperationalTabs.tsx:168-194` FeatureGate 래핑, FAIL 건수 동적 힌트 |
| R-05 | OrderManager 발주 실행 게이팅 | `DashboardOperationalTabs.tsx:196-220` OrderManager 탭 전체 게이팅 |

### 2.2 Should Requirements (4/4)

| ID | 요구사항 | 구현 결과 |
|----|----------|-----------|
| R-06 | PricingPage Plus 앵커링 강화 | indigo gradient + scale 확대 + glow 효과 + "추천 플랜" amber 배지 |
| R-07 | Feature Discovery 데모 | `FailManagementDemo.tsx` 샘플 5건 + DEMO 워터마크, localStorage 1회 제한 |
| R-08 | UpgradeModal 기능별 맞춤 문구 | `FEATURE_SAVINGS` 맵 (5개 기능 절감 비용 문구) |
| R-09 | 수술기록 보관 만료 예고 배너 | `DashboardOverview.tsx:188` 7일/30일 이하 색상 분기 배너 |

### 2.3 Could Requirements (2/2)

| ID | 요구사항 | 구현 결과 |
|----|----------|-----------|
| R-10 | 발주 이력 Free 10건 제한 | `OrderHistoryPanel.tsx:7` `FREE_PLAN_MAX_ENTRIES=10`, 잠금 배너 |
| R-11 | PricingPage 연간 결제 절약 배너 | Basic 72,000원 / Plus 168,000원 / Business 312,000원 절약 표시 |

### 2.4 Design Checklist (8/8)

| ID | 항목 | 결과 |
|----|------|------|
| D-01 | `audit_history` PlanFeature 추가 | `types/plan.ts:21` 주석 포함 |
| D-02 | basic.maxUsers: 3 → 1 | `types/plan.ts:106`, pricingData 표시 동기화 |
| D-03 | basic.maxBaseStockEdits: 5 → Infinity | `types/plan.ts:107`, "기초재고 무제한 편집" 표시 |
| D-04 | basic.retentionMonths: 6 → 12 | `types/plan.ts:108`, pricingData 비교표 동기화 |
| D-05 | plus.retentionMonths: 12 → 24, audit_history 추가 | `types/plan.ts:119,123` |
| D-06 | business.features에 `audit_log` 포함 | `types/plan.ts:139` 수정 완료 |
| D-07 | ultimate.features에 `audit_history` 추가 | `types/plan.ts:150` |
| D-08 | basic.features에 `inventory_audit` 추가 | `types/plan.ts:112` |

---

## 3. 보안 버그 수정 (Critical)

이번 PDCA에서 발견·수정한 보안 결함:

### B-1: invite-member Edge Function 하드코딩 5명 제한
- **문제**: `if ((memberCount ?? 0) >= 5)` — Basic(maxUsers=1) 병원도 5명까지 초대 가능
- **수정**: DB에서 hospital.plan 조회 → `PLAN_MAX_USERS` 맵으로 동적 제한
- **파일**: `supabase/functions/invite-member/index.ts`

### B-2: accept-invite Edge Function 동일 문제
- **문제**: invite-member와 동일한 하드코딩 5명 제한
- **수정**: 초대 수락 시점에도 병원 플랜 조회 및 동적 제한 적용
- **파일**: `supabase/functions/accept-invite/index.ts`

### B-3: authSignupConfig.ts 구 값 표시
- **문제**: Basic 요약 "3인 · 6개월 기록" (새 값: 1인 · 12개월)
- **수정**: "1인 · 12개월 기록", 태그 "팀용" → "개인용"
- **파일**: `components/auth/authSignupConfig.ts`

### B-4: UserProfile.tsx PLAN_PICKER_ITEMS 잘못된 값
- **문제**: Basic 카드에 Free 한도(50품목), Plus 카드에 구 Basic 한도(200품목, 3인) 표시
- **수정**: 실제 제한값으로 정정 (Basic: 200품목 1인, Plus: 500품목 5인)
- **파일**: `components/UserProfile.tsx`

---

## 4. 리팩터링 성과

요금제 재설계 과정에서 PricingPage 컴포넌트 분해 리팩터링 병행:

| 분리된 파일 | 설명 | 줄 수 |
|------------|------|:-----:|
| `hooks/usePricingPage.ts` | 상태·로직·이벤트 트래킹 훅 | 287줄 |
| `components/pricing/pricingData.tsx` | 플랜 카드·비교표·FAQ·퀴즈 데이터 | 252줄 |
| `components/pricing/PricingPaymentModal.tsx` | 결제 모달 UI | 분리 |
| `components/pricing/PricingTrialConsentModal.tsx` | 체험 동의 모달 | 분리 |
| `components/pricing/PricingWaitlistModal.tsx` | 대기 신청 모달 | 분리 |

**PricingPage.tsx**: 1,266줄 → 836줄 (430줄, 34% 감소)

---

## 5. 요금제 재설계 최종 결과

### 5.1 확정된 플랜 구조

| 기능 | Free | Basic | Plus | Business |
|------|:----:|:-----:|:----:|:--------:|
| 가격 (월) | 0원 | 29,000원 | 69,000원 | 129,000원 |
| 품목 수 | 50 | 200 | 500 | 무제한 |
| 사용자 수 | 1 | 1 | 5 | 무제한 |
| 수술기록 보관 | 3개월 | 12개월 | 24개월 | 24개월 |
| 기초재고 편집 | 3회 | 무제한 | 무제한 | 무제한 |
| 브랜드 분석 | X | O | O | O |
| FAIL 교환 관리 | X | **O (킬러)** | O | O |
| 발주 실행 | X | O | O | O |
| 재고실사 | X | O (이력 없음) | **O+이력** | O |
| 구성원 초대 | X | X | **O (킬러)** | O |
| 월간 리포트 | X | X | O | O |
| 발주 최적화 추천 | X | X | O | O |
| 감사 로그 | X | X | X | **O (킬러)** |
| AI 수요 예측 | X | X | X | O |

### 5.2 심리 설계 전략 구현 현황

| 전략 | 구현 상태 |
|------|-----------|
| "딱 충분히 제한" (Free 50품목, 3회 편집) | 완료 |
| "앵커링" (Plus 추천 플랜 시각화) | 완료 (indigo gradient + 추천 배지) |
| "Feature Discovery" (FAIL 탭 1회 미리보기) | 완료 |
| "데이터 축적 잠금" (만료 예고 배너) | 완료 |
| "손실 회피 프레이밍" (UpgradeModal 비용 절감 문구) | 완료 |

---

## 6. 잔여 과제 (Out of Scope)

이번 PDCA 범위 밖으로 분류된 장기 과제:

| 과제 | 우선순위 | 대상 플랜 |
|------|---------|-----------|
| 자동 재고 알림 (Solapi) | Q2 2026 | Plus |
| 재고실사 이력 리포트 대시보드 | Q2 2026 | Plus |
| AI 수요 예측 구현 | Q3 2026 | Business |
| 거래처 관리 (supplier_management) | Q3 2026 | Business |
| Feature Discovery 발주 최적화 데모 | Q2 2026 | Free |
| 데이터 만료 예고 알림 이메일 발송 | Q3 2026 | Free |

---

## 7. Gap Analysis Summary

- **분석 버전**: v5 (gap-detector Agent)
- **검증 항목**: 24개
- **PASS**: 24개
- **FAIL**: 0개 (D-06 audit_log Business 누락 → 수정 완료)
- **Match Rate**: **100%**

---

## 8. 결론

pricing-strategy-redesign은 계획된 모든 요구사항(Must 5개, Should 4개, Could 2개)을 완료하였으며,
추가로 발견된 보안 버그 4건과 D-06 데이터 불일치 1건을 수정하였다.

특히 Edge Function의 멤버 제한 하드코딩 버그(B-1, B-2)는 클라이언트 우회 공격이 가능한
보안 결함이었으나, 서버사이드에서 플랜별 동적 제한으로 완전히 수정되었다.

요금제 재설계 결과 Free-Basic 사이의 기능 차이가 명확해졌으며(FAIL 관리, 발주 실행, 브랜드 분석),
PricingPage의 Feature Discovery와 UpgradeModal 개인화를 통해 유료 전환 경로가 구체화되었다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-05 | Initial completion report | report-generator Agent |
