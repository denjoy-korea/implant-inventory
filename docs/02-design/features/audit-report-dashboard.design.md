# audit-report-dashboard Design Document

> **Summary**: 웹 재고실사 페이지 → 실사 리포트 대시보드 전환 설계
>
> **Author**: CTO Lead
> **Created**: 2026-03-05
> **Status**: Implemented (코드 선행 구현, 문서 후행 작성)

---

## 0. 사전 확인

| 항목 | 결과 |
|------|------|
| 구현 완료 여부 | **완료** — `feat: FAIL 탐지, 실사 리포트...` 커밋 포함 |
| Plan 문서 | `docs/01-plan/features/audit-report-dashboard.plan.md` |
| 진입점 | `components/InventoryAudit.tsx` — PC/Mobile 분기 |

---

## 1. 컴포넌트 구조 (실제 구현)

```
components/
  InventoryAudit.tsx              진입점 — isMobileViewport 분기
  audit/
    AuditReportDashboard.tsx      PC 리포트 대시보드 메인 (82 LOC)
    AuditReportKpiStrip.tsx       KPI 5개 지표 (63 LOC)
    AuditSessionTable.tsx         실사 이력 테이블 + 드릴다운 (158 LOC)
    AuditMismatchTrend.tsx        불일치 추이 SVG 차트 (108 LOC)
    AuditItemRanking.tsx          품목별 불일치 랭킹 Top 10 (56 LOC)
    AuditReasonChart.tsx          사유별 분석 차트 (60 LOC)
    AuditCycleIndicator.tsx       실사 주기 분석 (82 LOC)
    AuditMobileQrPanel.tsx        QR 코드 + URL 복사 (86 LOC)
    AuditHistoryModal.tsx         모바일 이력 모달 (167 LOC)
    hooks/
      useAuditReport.ts           데이터 계산 훅 — 6개 useMemo
    utils/
      auditReportUtils.ts         groupAuditSessions, calcAuditKpi,
                                  buildTrendData, buildItemRanking,
                                  buildReasonStats, calcCycleStats

hooks/
  useInventoryAudit.ts            모바일 실사 입력 상태 관리 (351 LOC)
```

---

## 2. 데이터 흐름

```
auditService.getAuditHistory(hospitalId)   ← useInventoryAudit
  │
  ▼
useAuditReport(auditHistory)               ← audit/hooks/useAuditReport.ts
  ├── sessions   = groupAuditSessions()    회차별 그룹핑 (날짜+담당자 키)
  ├── kpi        = calcAuditKpi()          KPI 5개 계산
  ├── trendData  = buildTrendData()        추이 차트 데이터
  ├── itemRanking= buildItemRanking()      품목별 불일치 빈도
  ├── reasonStats= buildReasonStats()      사유별 통계
  └── cycleStats = calcCycleStats()        주기 분석
  │
  ▼
AuditReportDashboard
  ├── AuditReportKpiStrip(kpi)
  ├── AuditMobileQrPanel(auditUrl)    } grid 2-col
  ├── AuditCycleIndicator(cycleStats) }
  ├── AuditMismatchTrend(trendData)
  ├── AuditItemRanking(itemRanking)   } grid 2-col
  ├── AuditReasonChart(reasonStats)   }
  └── AuditSessionTable(sessions)     드릴다운 포함
```

---

## 3. PC/Mobile 분기 로직

```tsx
// InventoryAudit.tsx
if (!isMobileViewport) {
  if (!planService.canAccess(plan ?? 'free', 'audit_history')) {
    return <UpgradeBanner />;   // Basic 미만 — 업그레이드 유도
  }
  return (
    <AuditReportDashboard
      auditHistory={auditHistory}
      isLoading={isHistoryLoading}
    />
  );
}
// 모바일: 기존 카드형 실사 입력 UI 유지
```

**플랜 게이트**: `audit_history` → Basic 이상 허용 (`planService.canAccess`)

---

## 4. 핵심 컴포넌트 상세

### 4-A. AuditReportKpiStrip
| KPI | 계산 기준 |
|-----|----------|
| 총 실사 횟수 | `sessions.length` |
| 마지막 실사일 | `sessions[0].date` |
| 경과일 | `today - lastAuditDate` |
| 평균 불일치율 | `avg(session.mismatchCount / session.totalCount)` |
| 최근 불일치 건수 | `sessions[0].mismatchCount` |

### 4-B. AuditSessionTable
- 회차별 요약 행 (날짜, 담당자, 총 품목, 불일치, 오차)
- 행 클릭 → 인라인 드릴다운 (불일치 품목 상세)
- `detailShowAll` 토글로 전체/불일치만 전환

### 4-C. AuditMismatchTrend
- SVG 직접 구현 (외부 라이브러리 없음)
- 회차별 불일치 건수 bar chart
- 빈 데이터 처리 포함

### 4-D. AuditMobileQrPanel
- `window.location.origin + '/#/dashboard/audit'` URL 생성
- `navigator.clipboard.writeText()` 클립보드 복사
- 외부 QR API 없음 — CSS grid로 픽셀 QR 직접 렌더링 또는 `qrcode.react`

---

## 5. 키 설계 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| PC/Mobile 분기 방식 | 컴포넌트 분리 (SRP) | 관심사 완전히 다름 |
| 데이터 그룹핑 위치 | 클라이언트 useMemo | 추가 API 불필요, 기존 패턴 재사용 |
| 차트 구현 | SVG 직접 | 번들 사이즈 최소화 |
| 상태 관리 | 컴포넌트 내부 로컬 | 페이지 로컬 상태로 충분 |
| 플랜 게이트 | Basic 이상 (`audit_history`) | Free 사용자 업그레이드 유도 |

---

## 6. 파일 크기 현황

| 컴포넌트 | LOC | 기준(400줄) |
|----------|----:|:----------:|
| AuditReportDashboard | 82 | ✅ |
| AuditReportKpiStrip | 63 | ✅ |
| AuditSessionTable | 158 | ✅ |
| AuditMismatchTrend | 108 | ✅ |
| AuditItemRanking | 56 | ✅ |
| AuditReasonChart | 60 | ✅ |
| AuditCycleIndicator | 82 | ✅ |
| AuditMobileQrPanel | 86 | ✅ |

모든 컴포넌트 400줄 이하 — Plan 품질 기준 충족.

---

## 7. 다음 단계

- [ ] Gap Analysis (`/pdca analyze audit-report-dashboard`)
- [ ] FR-03 드릴다운 동작 실사 검증
- [ ] FR-10 QR 코드 실제 스캔 테스트
