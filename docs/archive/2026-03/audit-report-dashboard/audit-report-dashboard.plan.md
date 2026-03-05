# audit-report-dashboard Planning Document

> **Summary**: 웹 재고실사 페이지를 실사 입력 UI에서 실사 리포트 대시보드로 전환
>
> **Project**: implant-inventory (DenJOY)
> **Version**: 1.0
> **Author**: CTO Lead
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 웹 `InventoryAudit.tsx` 페이지는 실사 입력 UI(체크박스, 수량 입력, 비고 선택, 완료 버튼)로 구성되어 있으나, PC 웹 환경에서 재고실사 입력은 현장과 동떨어져 있어 실질적 활용도가 낮다. 실사 입력은 모바일에서 현장에서 진행하는 것이 적합하다.

이 프로젝트는 웹 재고실사 페이지를 **실사 이력/현황 리포트 대시보드**로 전환하여, 관리자가 PC에서 실사 결과를 분석하고 의사결정에 활용할 수 있도록 한다.

### 1.2 Background

- 실사 입력은 모바일 현장에서 진행 (현재 모바일 카드형 UI 유지)
- 웹에서는 실사 결과 분석, 추이 파악, 문제 품목 식별이 더 가치 있음
- 기존 `auditService.getAuditHistory()` API와 `inventory_audits` 테이블의 데이터를 활용
- DashboardOverview에 이미 실사 요약 정보(최근 실사일, 불일치 건수)가 표시되고 있으므로, 상세 리포트 대시보드로 드릴다운하는 구조가 자연스러움

### 1.3 Related Documents

- 현재 코드: `components/InventoryAudit.tsx` (~1283줄)
- 서비스: `services/auditService.ts` (applyAudit, getAuditHistory)
- 대시보드 연동: `components/DashboardOverview.tsx` (latestAuditSummary, auditStaleDays)
- 탭 라우팅: `components/dashboard/DashboardOperationalTabs.tsx` (inventory_audit 탭)

---

## 2. Scope

### 2.1 In Scope

- [x] 웹(PC) 재고실사 페이지를 리포트 대시보드로 전환
- [x] 실사 이력 요약 테이블 (회차별 날짜, 담당자, 총 품목, 불일치 건수, 주요 항목)
- [x] 불일치 추이 차트 (회차별 불일치 건수/수량 트렌드, SVG 기반)
- [x] 품목별 누적 불일치 분석 (자주 불일치가 발생하는 브랜드/규격 랭킹)
- [x] 실사 회차 상세 드릴다운 (특정 회차 클릭 시 전체 품목 상세)
- [x] 실사 주기 분석 (마지막 실사 후 경과일, 실사 빈도 현황)
- [x] KPI strip 재설계 (리포트 관점으로 전환)

### 2.2 Out of Scope

- 모바일 실사 입력 UI (기존 카드형 UI 그대로 유지, 별도 분기)
- 실사 데이터 수정/삭제 기능 (현재 없으며 이번 범위에 포함하지 않음)
- 실사 일정 관리 / 캘린더 (향후 확장 가능)
- 실사 알림 / 자동 리마인더 (향후 확장 가능)
- 새로운 DB 테이블 추가 (기존 `inventory_audits` 테이블만 활용)
- QR 코드 인증/보안 (로그인은 기존 Supabase Auth 그대로 사용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 리포트 KPI Strip: 총 실사 횟수, 마지막 실사일, 경과일, 평균 불일치율, 최근 불일치 건수 | High | Pending |
| FR-02 | 실사 이력 요약 테이블: 회차별 날짜, 시간, 담당자, 실사 품목수, 불일치 건수, 총 오차 표시 | High | Pending |
| FR-03 | 회차 상세 드릴다운: 테이블 행 클릭 시 해당 회차의 전체 품목별 상세(브랜드, 규격, 시스템, 실제, 오차, 사유) | High | Pending |
| FR-04 | 불일치 추이 차트: 회차별 불일치 건수/수량 트렌드를 SVG line/bar chart로 표시 | Medium | Pending |
| FR-05 | 품목별 누적 불일치 분석: 브랜드+규격 조합별 불일치 빈도 랭킹 (Top 10) | Medium | Pending |
| FR-06 | 불일치 사유 분석: 사유별 빈도 차트 (기록 누락, 수술기록 오입력, 분실 등) | Medium | Pending |
| FR-07 | 실사 주기 분석: 평균 실사 간격, 마지막 실사 후 경과일, 권장 주기 대비 현황 | Low | Pending |
| FR-08 | 반응형: 모바일에서는 기존 실사 입력 UI 유지, PC에서는 리포트 대시보드 표시 | High | Pending |
| FR-09 | 빈 상태: 실사 이력이 없을 때 안내 메시지와 모바일 실사 유도 | Low | Pending |
| FR-10 | QR 코드 패널: PC 대시보드에 모바일 실사 URL QR 코드 표시. 스캔 시 `#/dashboard/audit`으로 직행, 모바일 뷰 자동 표시 | High | Pending |
| FR-11 | QR URL 클립보드 복사: QR 패널에서 URL 원클릭 복사 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 실사 이력 로드 < 500ms (100회차 기준) | 네트워크 탭 확인 |
| UX | SVG 차트 애니메이션 부드러운 렌더링 | 육안 확인 |
| Bundle Size | 외부 차트 라이브러리 불필요 (SVG 직접 구현) | 빌드 크기 비교 |
| Accessibility | 차트 데이터 테이블 대체 텍스트 제공 | 스크린리더 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] PC 웹에서 실사 리포트 대시보드 정상 표시
- [x] 모바일에서 기존 실사 입력 UI 정상 동작 (기능 퇴행 없음)
- [x] 5개 KPI 지표 정상 계산 및 표시
- [x] 실사 이력 테이블 + 드릴다운 동작
- [x] 불일치 추이 차트 렌더링
- [x] 품목별 불일치 랭킹 표시
- [x] DashboardOverview 실사 카드에서 탭 이동 시 리포트 대시보드 표시

### 4.2 Quality Criteria

- [x] TypeScript strict 모드 에러 없음
- [x] Tailwind CSS만 사용 (인라인 스타일 최소화)
- [x] 컴포넌트 파일 400줄 이하 (서브 컴포넌트 분리)
- [x] 기존 UI 스타일 가이드 준수 (`.claude/commands/ui-style.md`)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 모바일/PC 분기 로직 복잡도 증가 | Medium | Medium | `isMobileViewport` 기존 패턴 재사용, 조건부 렌더링 최소화 |
| 실사 이력 대량 데이터 성능 | Medium | Low | `auditService.getAuditHistory` 이미 desc 정렬, 클라이언트 그룹핑 memo로 처리 |
| 기존 InventoryAudit.tsx 1283줄 → 리팩터링 범위 확대 | High | Medium | 단계적 분리: 모바일 입력 UI를 서브 컴포넌트로 추출 후, PC는 리포트 렌더링 |
| DashboardOverview 실사 카드와 중복 로직 | Low | High | 공통 유틸 함수 추출 (groupAuditSessions, calcAuditKpi) |
| SVG 차트 구현 복잡도 | Medium | Low | 기존 `utils/chartUtils.ts` buildSparklinePath 패턴 재사용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS | O |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| PC/Mobile 분기 | A) 단일 컴포넌트 조건부 렌더링 B) 2개 컴포넌트 분리 | B) 분리 | 모바일 입력 UI와 PC 리포트 대시보드는 관심사가 완전히 다름. SRP 원칙 준수 |
| 차트 구현 | A) 외부 라이브러리 B) SVG 직접 구현 | B) SVG 직접 | 기존 `buildSparklinePath` 패턴 통일, 번들 사이즈 최소화 |
| 데이터 그룹핑 | A) 서버 사이드 B) 클라이언트 사이드 | B) 클라이언트 | 기존 `groupedHistory` useMemo 패턴 재사용, 추가 API/RPC 불필요 |
| 상태 관리 | A) 부모 전달 B) 컴포넌트 내부 | B) 내부 | 리포트 데이터는 페이지 로컬 상태로 충분, prop drilling 불필요 |

### 6.3 컴포넌트 구조

```
components/
  InventoryAudit.tsx          -- 엔트리포인트 (PC/Mobile 분기)
  audit/
    AuditReportDashboard.tsx  -- PC 리포트 대시보드 메인
    AuditReportKpiStrip.tsx   -- KPI 5개 지표
    AuditSessionTable.tsx     -- 실사 이력 요약 테이블 + 드릴다운
    AuditMismatchTrend.tsx    -- 불일치 추이 차트 (SVG)
    AuditItemRanking.tsx      -- 품목별 누적 불일치 랭킹
    AuditReasonChart.tsx      -- 사유별 분석 차트
    AuditCycleIndicator.tsx   -- 실사 주기 분석 (경과일 등)
    AuditMobileQrPanel.tsx    -- PC→모바일 전환 QR 코드 패널
    AuditMobileInput.tsx      -- 모바일 실사 입력 UI (기존 코드 추출)
  audit/hooks/
    useAuditReport.ts         -- 리포트 데이터 계산 커스텀 훅
  audit/utils/
    auditReportUtils.ts       -- 그룹핑, KPI 계산, 차트 데이터 변환
```

### 6.4 데이터 흐름

```
auditService.getAuditHistory(hospitalId)
  |
  v
useAuditReport(auditHistory)              -- 커스텀 훅
  |-- groupedSessions (회차별 그룹핑)
  |-- kpiData (KPI 지표 계산)
  |-- trendData (추이 차트 데이터)
  |-- itemRanking (품목별 랭킹)
  |-- reasonStats (사유별 통계)
  |-- cycleStats (주기 분석)
  |
  v
AuditReportDashboard
  |-- AuditReportKpiStrip(kpiData)
  |-- AuditMismatchTrend(trendData)
  |-- AuditSessionTable(groupedSessions)
  |-- AuditItemRanking(itemRanking)
  |-- AuditReasonChart(reasonStats)
  |-- AuditCycleIndicator(cycleStats)
  |-- AuditMobileQrPanel(auditUrl)    -- QR 코드 + URL 복사
```

---

## 7. Implementation Plan

### Phase 1: 기반 구조 (우선순위 High)

1. **`audit/utils/auditReportUtils.ts`** 생성
   - `groupAuditSessions(history)` -- 기존 `groupedHistory` 로직 추출
   - `calcAuditKpi(sessions)` -- KPI 계산
   - `buildTrendData(sessions)` -- 차트용 데이터 변환
   - `buildItemRanking(history)` -- 품목별 불일치 랭킹
   - `buildReasonStats(history)` -- 사유별 통계
   - `calcCycleStats(sessions)` -- 실사 주기 분석

2. **`audit/hooks/useAuditReport.ts`** 생성
   - auditHistory를 입력받아 모든 분석 데이터를 useMemo로 계산

3. **`audit/AuditMobileInput.tsx`** 분리
   - 기존 InventoryAudit.tsx의 모바일 실사 입력 UI를 서브 컴포넌트로 추출
   - props 인터페이스 정의

### Phase 2: 리포트 컴포넌트 구현 (우선순위 High)

4. **`audit/AuditReportKpiStrip.tsx`** 구현
   - 총 실사 횟수, 마지막 실사일, 경과일, 평균 불일치율, 최근 불일치 건수

5. **`audit/AuditSessionTable.tsx`** 구현
   - 회차별 요약 + 클릭 드릴다운 (기존 history modal 패턴 인라인화)

6. **`audit/AuditMismatchTrend.tsx`** 구현
   - SVG line chart (buildSparklinePath 확장)

### Phase 3: 분석 컴포넌트 구현 (우선순위 Medium)

7. **`audit/AuditItemRanking.tsx`** 구현
   - 불일치 빈도 Top 10 품목 (horizontal bar chart)

8. **`audit/AuditReasonChart.tsx`** 구현
   - 사유별 빈도 (도넛 또는 horizontal bar)

9. **`audit/AuditCycleIndicator.tsx`** 구현
   - 경과일 표시, 주기 시각화

10. **`audit/AuditMobileQrPanel.tsx`** 구현
    - `qrcode.react` 라이브러리 사용 (클라이언트 사이드 렌더, 외부 API 호출 없음)
    - QR 코드 URL: `{window.location.origin}/#/dashboard/audit`
    - "현장 실사 시작" 카드 스타일, QR + URL 텍스트 + 클립보드 복사 버튼
    - 모바일 스캔 → 로그인 → 자동으로 `#/dashboard/audit` → 모바일 입력 UI 표시

### Phase 4: 통합 및 분기 처리 (우선순위 High)

10. **`audit/AuditReportDashboard.tsx`** 조합
    - Phase 2~3 컴포넌트를 CollapsibleSection으로 배치

11. **`InventoryAudit.tsx` 리팩터링**
    - PC: AuditReportDashboard 렌더링
    - Mobile: AuditMobileInput 렌더링
    - showHistory 모달은 PC에서 불필요 (인라인 테이블로 대체)

12. **DashboardOverview 연동 확인**
    - 실사 카드 탭 이동 시 리포트 대시보드 정상 표시

---

## 8. Team Composition (CTO Recommendation)

### Orchestration Pattern: Leader (Plan) -> Swarm (Do)

| Role | Agent | Responsibility |
|------|-------|----------------|
| CTO Lead | cto-lead | 전체 아키텍처 결정, 품질 게이트 관리, 단계 전환 |
| Frontend Architect | frontend-architect | 컴포넌트 구조 설계, SVG 차트 패턴 정의, UI 스타일 가이드 준수 확인 |
| Backend Expert | bkend-expert | auditReportUtils 유틸 함수 구현, 데이터 그룹핑/계산 로직 |
| QA Strategist | qa-strategist | PC/모바일 분기 동작 검증, 기존 기능 퇴행 테스트, 엣지 케이스 |

### Quality Gates

| Gate | Criteria | Decision |
|------|----------|----------|
| Phase 1 완료 | utils + hooks 단위 테스트 가능한 수준 | Proceed to Phase 2 |
| Phase 2 완료 | 핵심 3개 컴포넌트(KPI, Table, Chart) 렌더링 | Proceed to Phase 3 |
| Phase 4 완료 | PC/모바일 분기 정상 동작, 기존 기능 퇴행 없음 | Gap Analysis |
| Match Rate >= 90% | Plan 대비 구현 일치도 | Report |

---

## 9. Convention Prerequisites

### 9.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] UI Style Guide: `.claude/commands/ui-style.md`
- [x] Tooltip pattern: `.claude/commands/tooltip.md`
- [x] TypeScript configuration (`tsconfig.json`)
- [x] z-index 관리: `utils/zIndex.ts`

### 9.2 Conventions to Follow

| Category | Rule | Reference |
|----------|------|-----------|
| **QR Library** | `qrcode.react` — npm install 필요 (`npm i qrcode.react`) | 클라이언트 사이드, 외부 API 없음 |
| **File size** | 컴포넌트 400줄 이하 | 기존 FailKpiStrip 분리 패턴 |
| **SVG Chart** | `utils/chartUtils.ts` buildSparklinePath 패턴 | 기존 chartUtils |
| **Hooks** | 도메인 로직은 커스텀 훅으로 분리 | useSparklineSeries 패턴 |
| **Naming** | 서브 컴포넌트는 `components/audit/` 하위 | fail/, order/ 패턴 |
| **Styling** | Tailwind CSS only, 기존 디자인 시스템 준수 | ui-style.md |
| **Korean Labels** | 영어 부제목 없이 한글 단독 표기 | 2026-03-03 작업 결과 |

---

## 10. Next Steps

1. [x] Plan 문서 작성 완료
2. [ ] Design 문서 작성 (`audit-report-dashboard.design.md`)
3. [ ] 팀 리뷰 및 승인
4. [ ] 구현 시작 (Phase 1 -> Phase 4 순서)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial draft | CTO Lead |
