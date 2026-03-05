# pricing-strategy-redesign Plan Document

> **Summary**: 치과 임플란트 재고관리 SaaS의 요금제 차별화 전략 분석 및 재설계. Free/Basic 기능 동일 문제를 해소하고 각 플랜의 심리적으로 강력한 킬러 피처를 재배치한다.
>
> **Author**: Product Manager Agent
> **Created**: 2026-03-05
> **Last Modified**: 2026-03-05
> **Status**: Draft

---

## 1. 현재 요금제 구조적 문제 진단

### 1.1 실제 구현 현황 (`types.ts` PLAN_LIMITS 기준)

| 플랜 | 월가격 | maxItems | maxUsers | 기능 목록 |
|------|--------|---------|---------|-----------|
| Free | 0원 | 100 | 1 | dashboard_basic, excel_upload, realtime_stock, brand_analytics |
| Basic | 29,000원 | 200 | 3 | **Free와 완전히 동일** |
| Plus | 69,000원 | 500 | 5 | +dashboard_advanced, auto_stock_alert, monthly_report, role_management, email_support, integrations |
| Business | 129,000원 | 무제한 | 무제한 | +yearly_report, supplier_management, one_click_order, ai_forecast, priority_support |

### 1.2 핵심 문제 5가지

**문제 1: Free-Basic 기능 동일 (가장 심각)**
- Basic(29,000원)이 Free와 동일한 기능 목록을 제공한다.
- 차이는 품목 수(100 vs 200)와 사용자 수(1 vs 3)뿐이다.
- 실제 치과 임플란트 품목 수가 100개를 넘는 경우는 대형 병원뿐이어서, 소규모 개인 치과는 Basic 전환 동기가 없다.
- 결론: **29,000원을 낼 이유가 없다.**

**문제 2: brand_analytics가 Free에 포함됨 (설계 오류)**
- 당초 설계서(pricing-policy.design.md)에서 brand_analytics는 Basic 이상으로 설계되었다.
- 현재 PLAN_LIMITS에서 Free에 포함되어 있다.
- "브랜드별 소모 분석"은 임플란트 특화 핵심 기능으로, Free에서 제공하면 Basic 전환 가치가 사라진다.

**문제 3: FAIL 관리(교환 관리)가 어느 플랜에도 명시되지 않음**
- `FailManager`는 임플란트 재고관리 SaaS에서 가장 차별화된 임플란트 특화 기능이다.
- 현재 `PlanFeature` 타입에 `fail_management` 식별자조차 없다.
- 경쟁 제품(덴트웹 등)이 없는 기능임에도 플랜 차별화에 활용되지 않고 있다.

**문제 4: 재고실사, 발주최적화, 반품관리가 플랜 제한 없이 전면 오픈**
- `audit_log`는 Business 기능으로 정의되어 있으나, 재고실사(`InventoryAudit`) 자체는 게이팅이 없다.
- 발주 최적화(OptimizeModal)와 반품관리(ReturnManager)도 마찬가지다.
- 유료 전환 레버로 쓸 수 있는 기능들이 모두 무료로 개방되어 있다.

**문제 5: 가격 점프 비율이 심리적으로 불균형**
- Free(0) → Basic(29,000) → Plus(69,000) → Business(129,000)
- Free-Basic 점프: 무한대(0에서 유료)
- Basic-Plus 점프: 2.4배
- Plus-Business 점프: 1.9배
- 가장 어려운 첫 전환(Free → 유료)에서 기능 차이가 없으니 전환이 일어나지 않는다.

---

## 2. 재설계된 플랜별 킬러 피처 매핑

### 2.1 설계 원칙

치과 임플란트 재고관리의 사용자 여정을 기반으로 각 플랜을 정의한다:
- **Free**: 데이터 축적 단계 (체험 + 락인)
- **Basic**: 개인 담당자 자동화 (혼자 쓰는 병원의 핵심)
- **Plus**: 팀 운영 + 경영 인사이트 (2인 이상 병원)
- **Business**: 다지점 + 완전 자동화 네트워크

### 2.2 재설계 요금제 테이블

| 기능 | Free | Basic | Plus | Business |
|------|:----:|:-----:|:----:|:--------:|
| **가격 (월)** | 0원 | 29,000원 | 69,000원 | 129,000원 |
| **품목 수** | 50 | 200 | 500 | 무제한 |
| **사용자** | 1 | 1 | 5 | 무제한 |
| **수술기록 보관** | 3개월 | 12개월 | 24개월 | 무제한 |
| --- 핵심 기능 --- | | | | |
| 실시간 재고 현황 | O | O | O | O |
| 엑셀 업로드/다운로드 | O | O | O | O |
| 기초재고 설정 | O (3회/월) | O (무제한) | O | O |
| 발주 권장 목록 | O (읽기 전용) | **O (발주 가능)** | O | O |
| **FAIL(교환) 관리** | X | **O (Basic 킬러)** | O | O |
| 제조사별 소모 분석 | X | **O** | O | O |
| 재고실사 | X | O (이력 없음) | **O (이력 + 분석)** | O |
| 구성원 초대 | X | X | **O (Plus 킬러)** | O |
| 역할별 권한 관리 | X | X | O | O |
| 월간 리포트 | X | X | **O** | O |
| 발주 최적화 추천 | X | X | **O** | O |
| Slack/Notion 연동 | X | X | O | O |
| 연간 리포트 | X | X | X | **O** |
| 감사 로그 | X | X | X | **O** |
| AI 수요 예측 | X | X | X | **O (Business 킬러)** |
| 우선 지원 | X | X | X | O |
| **엑셀 내보내기** | O (월 3회) | O (무제한) | O | O |

### 2.3 각 플랜의 킬러 피처 설명

#### Free - "데이터 축적 체험판"
킬러 피처: 기초재고 설정 + 실시간 현황 (락인 핵심)
- 수술기록 업로드 후 재고 자동 차감 체험 가능
- 발주 권장 목록은 보이되 "발주 버튼"은 잠김 → 욕구 유발
- FAIL 교환 탭은 "잠금" 상태로 UI 노출 → Feature Discovery
- 3개월 수술기록만 저장 → 데이터가 쌓일수록 Basic 전환 압박

#### Basic - "혼자 쓰는 병원의 필수 도구"
킬러 피처: FAIL(교환) 관리
- 치과에서 가장 빈번하게 발생하는 업무 중 하나가 임플란트 교환
- 교환 접수 → 수량 추적 → 입고 확인을 자동화하는 기능이 29,000원 정당화의 핵심
- 추가: 제조사별 소모 분석(brand_analytics) Basic으로 이동
- 추가: 발주 실행 기능(수동 발주 생성 및 수령 처리)
- 추가: 기초재고 편집 횟수 제한 해제
- 사용자 1명 유지 → "혼자 쓰는 원장님/실장님" 타겟 명확화

#### Plus - "팀이 쓰는 병원의 운영 인텔리전스"
킬러 피처: 구성원 초대(팀 공유) + 재고실사 이력 분석
- 2인 이상 병원(원장 + 실장 구조)의 핵심 니즈: 공유와 권한 관리
- 재고실사 이력 + 불일치 추이 분석(audit-report-dashboard 기능)
- 월간 리포트: 제조사별, 브랜드별 월간 소모 요약
- 발주 최적화 추천(OptimizeModal)
- Slack/Notion 연동 알림

#### Business - "다지점 또는 고부가가치 병원"
킬러 피처: AI 수요 예측 + 감사 로그 + 연간 분석
- AI 기반 적정 발주량 예측(현재 코드에 forecastConfidence 필드 존재)
- 전체 작업 감사 로그(AuditLogViewer)
- 연간 리포트: 제조사 협상, 원가 관리용
- 무제한 구성원 + 무제한 품목

---

## 3. 치과 SaaS 심리 전략 5가지

### 전략 1: "딱 충분히 제한" (Free 범위 재조정)
Free 플랜을 현재보다 약간 더 제한한다:
- **품목 수 50개** (현재 100개 → 인하): 소규모 개인치과도 품목이 70~120개이므로 50개는 체험 후 반드시 전환을 유도
- **기초재고 편집 3회/월**: 기존 `maxBaseStockEdits: 3` 활용. 첫 셋업 후 수정할 때 막힘
- **발주 버튼 잠금, 리스트는 노출**: "이 3개 품목을 발주해야 합니다" 화면을 보여주되 버튼 클릭 시 업그레이드 유도
- **FAIL 탭 잠금, 존재는 노출**: 교환 탭을 메뉴에 흐릿하게 표시해 존재를 인식시킴

### 전략 2: "앵커링" (Plus를 추천 플랜으로 시각화)
- 요금제 페이지에서 Plus 카드를 가장 크게, 인디고 색상으로 강조
- "가장 인기" 배지를 Plus에 단독 적용
- 가격 표시: Business(129,000원) 먼저 제시 후 Plus(69,000원) → "이 정도 가격이면 합리적" 인식
- 연간 결제 시 Plus는 55,000원 → "월 55,000원에 팀 전체가 사용" 메시지

### 전략 3: "Feature Discovery" (업그레이드 전 맛보기)
- Free 사용자가 FAIL 탭에 처음 접근하면 LockedOverlay 대신 **데모 데이터로 1회 미리보기** 허용
- "교환 5건이 있는 이번 달 현황 예시" → 실제 데이터가 아닌 샘플로 기능 체험
- 발주 최적화(Plus) 진입 시: "2개 품목에서 최적화 기회가 발견되었습니다. Plus에서 확인하세요." 구체적 숫자 제시
- UpgradeModal에서 "이 기능으로 아낄 수 있는 비용" 계산기 표시 검토

### 전략 4: "데이터 축적 잠금" (Retention Lock-in)
- 수술기록 보관: Free 3개월 → Basic 12개월
  - 3개월 후 오래된 데이터가 삭제 예고 알림 발송 → 전환 압박
  - "2026년 1월 수술기록이 곧 만료됩니다" 배너
- 발주 이력: Free는 최근 10건만 보기 → Basic은 전체 이력
- 감사 로그: Business 전용 → 데이터가 많이 쌓인 고객은 이 이력을 잃기 싫어함

### 전략 5: "손실 회피 프레이밍" (Landing/Upgrade 메시지)
- Free → Basic 전환 메시지: "29,000원으로 교환 실수 1건 방지" (교환 비용 평균 수십만 원 대비)
- Basic → Plus 전환 메시지: "팀원과 공유 안 하면 혼자 야근"
- 연간 결제 유도: "월 결제 대비 2개월 무료 = 연간 138,000원 절약" 구체적 금액 표시

---

## 4. 즉시 적용 vs 구현 필요 개선안

### 4.1 코드 변경 없이 즉시 적용 가능 (상수 변경만)

| 변경 항목 | 파일 | 변경 내용 | 효과 |
|-----------|------|-----------|------|
| brand_analytics를 Basic 이상으로 이동 | `types.ts` | Free features 배열에서 제거 | Basic 전환 동기 생성 |
| Free maxItems 100 → 50 | `types.ts` | maxItems: 50 | 체험 후 전환 압박 강화 |
| Basic maxUsers 3 → 1 | `types.ts` | maxUsers: 1 | "혼자 쓰는 병원" 타겟 명확화 + Plus 팀 가치 부각 |
| plus retentionMonths 12 → 24 | `types.ts` | 보관 기간 확대 | Plus 가치 강화 |
| PlanFeature에 'fail_management' 추가 | `types.ts` | 타입 추가 | FAIL 기능 게이팅 기반 |
| PlanFeature에 'order_execution' 추가 | `types.ts` | 타입 추가 | 발주 실행 게이팅 기반 |
| PlanFeature에 'audit_history' 추가 | `types.ts` | 타입 추가 | 실사 이력 게이팅 기반 |

### 4.2 소규모 구현 필요 (1~2일, 기존 FeatureGate 활용)

| 변경 항목 | 파일 | 작업 내용 | 우선순위 |
|-----------|------|-----------|---------|
| FAIL 탭 FeatureGate 래핑 | `FailManager.tsx` + `DashboardOperationalTabs.tsx` | `<FeatureGate feature="fail_management">` 적용, 잠금 오버레이에 Free 데모 데이터 1회 노출 | Must |
| 발주 실행 버튼 게이팅 | `OrderManager.tsx` | 발주 생성 버튼에 `canAccess('order_execution')` 체크 | Must |
| 기초재고 편집 횟수 제한 강화 | `BaseStockModal.tsx` | `maxBaseStockEdits` Free 3회 → 월 초기화 로직 추가 | Should |
| 수술기록 보관 기간 만료 알림 배너 | `DashboardOverview.tsx` | `retentionDaysLeft` 경고 배너 (이미 타입 필드 존재) | Should |
| 발주 이력 Free 10건 제한 | `OrderHistoryPanel.tsx` | Free 플랜 시 maxHistory 조건 추가 | Could |

### 4.3 중규모 구현 필요 (3~5일)

| 변경 항목 | 설명 | 우선순위 |
|-----------|------|---------|
| UpgradeModal 메시지 개인화 | 각 기능 차단 시 "이 기능으로 아낄 수 있는 비용" 문구 커스텀 | Should |
| Feature Discovery 데모 레이어 | FAIL/발주최적화 진입 시 샘플 데이터 1회 미리보기 | Could |
| 연간 결제 할인 배너 | PricingPage에 연간 결제 시 절약 금액 강조 배너 | Should |
| 데이터 만료 예고 알림 시스템 | Free 3개월 수술기록 만료 7일 전 알림 | Could |

### 4.4 장기 구현 필요 (1~2주)

| 변경 항목 | 설명 | 우선순위 |
|-----------|------|---------|
| AI 수요 예측 구현 | `predictedDailyUsage`, `forecastConfidence` 필드 이미 있음, 예측 모델 구현 | Could |
| 거래처 관리 (supplier_management) | 업체 DB, 연락처, 발주 이력 연결 | Could |
| 자동 재고 알림 (auto_stock_alert) | Solapi 연동 이미 있음, 알림 규칙 설정 UI | Should |

---

## 5. 장기 로드맵 및 미구현 기능 구현 우선순위

### 5.1 4주 내 즉시 실행 (운영 지속성)

```
Week 1: types.ts 상수 변경 (brand_analytics Free 제거, Free maxItems 50, 새 PlanFeature 추가)
Week 1: FailManager FeatureGate 적용 (Basic 이상)
Week 2: OrderManager 발주 실행 버튼 게이팅
Week 2: PricingPage 앵커링 UI 개선 (Plus 강조, 연간 할인 배너)
Week 3: 수술기록 보관 기간 만료 알림 배너
Week 4: UpgradeModal 메시지 개인화
```

### 5.2 Q2 2026 구현 목표

| 기능 | 대상 플랜 | 비즈니스 임팩트 |
|------|-----------|---------------|
| 자동 재고 알림 (Solapi) | Plus | Plus 리텐션 강화, LTV 증가 |
| 재고실사 이력 리포트 | Plus | audit-report-dashboard Plan 이미 작성됨 |
| Feature Discovery 데모 | Free | Free → Basic/Plus 전환율 개선 |
| 발주 최적화 게이팅 강화 | Plus | Plus 킬러 피처 명확화 |

### 5.3 Q3 2026 구현 목표

| 기능 | 대상 플랜 | 비즈니스 임팩트 |
|------|-----------|---------------|
| AI 수요 예측 | Business | Business 차별화, ARPU 상승 |
| 거래처 관리 | Business | 대형 치과 네트워크 공략 |
| 다지점 통합 관리 | Business | Enterprise 급 고객 확보 |
| 월간 자동 리포트 이메일 | Plus | 자동화 가치 체감 → 리텐션 |

---

## 6. 성공 지표 (Success Metrics)

### 6.1 요금제 재설계 효과 측정

| 지표 | 현재 기준 | 목표 (4주) | 목표 (3개월) |
|------|-----------|-----------|------------|
| Free → Basic 전환율 | 측정 필요 | 5% | 10% |
| Free → Plus 직접 전환율 | 측정 필요 | 3% | 7% |
| Plus 추천 플랜 선택 비율 | 측정 필요 | 60% | 70% |
| 연간 결제 비율 | 측정 필요 | 20% | 35% |
| Basic 해지율 (30일) | 측정 필요 | < 15% | < 10% |

### 6.2 킬러 피처 활성화 지표

| 지표 | 측정 방법 |
|------|----------|
| FAIL 관리 기능 활성화율 (Basic+) | 월 1회 이상 FAIL 기록 병원 비율 |
| 발주 실행 사용률 (Basic+) | 발주 생성 기능 사용 병원 비율 |
| 팀원 초대 완료율 (Plus+) | 구성원 2명 이상 사용 병원 비율 |
| Feature Discovery 전환 기여 | FAIL 미리보기 후 업그레이드 전환율 |

---

## 7. Scope

### 7.1 In Scope (이번 Plan)

- [x] 현재 요금제 구조적 문제 진단
- [x] 재설계된 플랜별 킬러 피처 매핑 테이블
- [x] 심리적 설계 원칙 5가지
- [x] 즉시 적용 가능한 개선안 (코드 변경 없이 vs 구현 필요)
- [x] 장기 로드맵 및 미구현 기능 구현 우선순위
- [ ] types.ts 상수 변경 구현 (별도 Do 단계)
- [ ] FeatureGate 적용 구현 (별도 Do 단계)

### 7.2 Out of Scope (이번 Plan)

- 결제 시스템 변경 (TossPayments 기존 연동 그대로 유지)
- 가격 자체의 변경 (29,000/69,000/129,000 구조 유지)
- 신규 기능 구현 (AI 예측, 거래처 관리 등)
- 랜딩 페이지 전면 개편

---

## 8. Requirements

### 8.1 Must (이번 반드시)

| ID | 요구사항 |
|----|----------|
| R-01 | types.ts에서 brand_analytics를 Free 기능 목록에서 제거하고 Basic 이상으로 이동 |
| R-02 | Free maxItems를 100 → 50으로 조정 |
| R-03 | PlanFeature 타입에 'fail_management', 'order_execution', 'audit_history' 추가 |
| R-04 | FailManager에 FeatureGate('fail_management') 적용 (Basic 이상) |
| R-05 | OrderManager 발주 생성 버튼에 FeatureGate('order_execution') 적용 (Basic 이상) |

### 8.2 Should (가능하면)

| ID | 요구사항 |
|----|----------|
| R-06 | PricingPage Plus 카드 앵커링 시각화 강화 (가장 크게, "가장 인기" 배지) |
| R-07 | FAIL 탭 잠금 시 Feature Discovery: 샘플 데이터 1회 미리보기 UX |
| R-08 | UpgradeModal에 기능별 맞춤 설득 문구 추가 |
| R-09 | Free 3개월 보관 만료 예고 배너 (DashboardOverview) |

### 8.3 Could (시간 되면)

| ID | 요구사항 |
|----|----------|
| R-10 | 발주 이력 Free 10건 제한 |
| R-11 | 연간 결제 할인 배너 (절약 금액 계산 표시) |

### 8.4 Won't (이번 범위 밖)

| ID | 요구사항 |
|----|----------|
| R-12 | 가격 변경 (29,000/69,000/129,000 유지) |
| R-13 | AI 예측 모델 구현 |
| R-14 | 다지점 관리 기능 |

---

## 9. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Free 제한 강화로 신규 가입 감소 | High | Medium | 14일 Plus 무료 체험 배너 강화로 보완 |
| FAIL 기능 Basic 이동으로 기존 Free 사용자 이탈 | Medium | Low | 기존 Free 사용자에게 30일 유예 기간 제공, 이관 공지 |
| brand_analytics Free 제거로 초기 체험 가치 감소 | Medium | Medium | 실시간 재고 현황만으로도 충분한 초기 가치 있음 |
| FeatureGate 적용 중 기존 데이터 표시 버그 | Low | Medium | 읽기 전용 표시는 허용, 작업(발주/교환 생성)만 차단 |

---

## 10. Timeline

| 단계 | 기간 | 내용 |
|------|------|------|
| Design (이 다음 단계) | 1일 | 변경 파일 목록, 코드 변경 상세 설계 |
| Do (구현) | 2~3일 | R-01~R-05 Must 구현 |
| Check (Gap 분석) | 0.5일 | 설계 대비 구현 일치도 검증 |
| Act (배포) | 0.5일 | 기존 Free 사용자 공지 후 배포 |

---

## 11. Related Documents

- 기존 요금제 설계: `docs/archive/2026-02/pricing-policy/pricing-policy.design.md`
- 기존 요금제 분석: `docs/archive/2026-02/pricing-policy/pricing-policy.analysis.md`
- 현재 구현: `/types.ts` (PLAN_LIMITS, PLAN_PRICING)
- 기존 서비스: `/services/planService.ts`
- 기능 게이팅: `/components/FeatureGate.tsx`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial draft | Product Manager Agent |
