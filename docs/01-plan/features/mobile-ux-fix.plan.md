# mobile-ux-fix Planning Document

> **Summary**: 모바일 환경 UI/UX 개선 — 터치 타겟, 폰트 가독성, iOS safe-area, bottom-sheet 통일, 차트 스와이프 대응
>
> **Project**: DenJOY / DentWeb (implant-inventory)
> **Version**: 0.1
> **Author**: AI Analysis
> **Date**: 2026-03-21
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

모바일 기기에서 앱을 사용하는 치과 의사/스탭 사용자들의 UX를 개선한다. 분석 결과 터치 타겟 미달, `text-[10px]` 가독성 문제, iOS 노치 미대응, bottom-sheet 미적용 모달 3개, 차트 스와이프 힌트 부재가 주요 이슈로 확인됨.

### 1.2 Background

2026-03-21 모바일 UI/UX 전수 분석 결과:
- 전체 평균 점수: **73/100**
- 터치 타겟: **68/100** (닫기 버튼 ~32px — WCAG 44px 미달)
- 폰트: **72/100** (`text-[10px]`·`text-[11px]` 모바일 가독성 불량)
- 접근성: **75/100** (iOS safe-area-inset 미적용)
- 차트 인터랙션: **65/100** (스와이프 힌트 없음)

### 1.3 Related Documents

- 분석 리포트: 2026-03-21 세션 모바일 UI/UX 분석 (채팅)
- UI 스타일 가이드: `.claude/commands/ui-style.md`
- ModalShell: `components/shared/ModalShell.tsx`

---

## 2. Scope

### 2.1 In Scope

**P0 — 즉각 수정 (접근성/크래시 위험)**
- [ ] FR-01: 모달 닫기 버튼 최소 44×44px 확보
- [ ] FR-02: iOS safe-area-inset 대응 (ModalShell + 하단 시트 모달)

**P1 — 중요 UX 개선**
- [ ] FR-03: `text-[10px]` → `text-xs`(12px) 이상으로 전수 치환
- [ ] FR-04: 차트 수평 스크롤 힌트 (우측 fade 그라디언트)
- [ ] FR-05: UnregisteredDetailModal, ManualFixModal, FailReturnModal → bottom-sheet 적용

**P2 — 디자인 일관성**
- [ ] FR-06: 모달 헤더 스타일 가이드 정리 (색상 코딩 의도 문서화 또는 통일)
- [ ] FR-07: 모바일 CTA 버튼 높이 `h-12`/`h-14` 표준화

### 2.2 Out of Scope

- 모달 스와이프 다운 닫기 제스처 (별도 PDCA)
- 스크롤 그림자 인디케이터 (낮은 ROI)
- 키보드 접근성 전수 검증 (별도 접근성 PDCA)
- 데스크톱 UI 변경

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 영향 파일 |
|----|---------|---------|----------|
| FR-01 | 모든 모달 닫기(X) 버튼: `min-w-[44px] min-h-[44px]` 또는 `p-3` | High | 다수 모달 |
| FR-02 | ModalShell: 하단 시트 모달에 `pb-[env(safe-area-inset-bottom,0px)]` 적용 | High | ModalShell.tsx, 하단시트 모달들 |
| FR-03 | `text-[10px]` 전수 → `text-[11px]` 이상, `text-[11px]` → `text-xs`(12px) 검토 | High | BaseStockModal, 다수 |
| FR-04 | MonthlyTrendChart, PlacementTrendChart: 우측 fade 마스크 + "← 스크롤" 힌트 | Medium | 차트 컴포넌트 2개 |
| FR-05 | 3개 모달 bottom-sheet 전환: `backdropClassName="flex items-end sm:items-center"` + `rounded-t-3xl sm:rounded-2xl` | Medium | UnregisteredDetailModal, ManualFixModal, FailReturnModal |
| FR-06 | 모달 헤더 색상 사용 기준 CLAUDE.md에 문서화 | Low | CLAUDE.md |
| FR-07 | 모바일 CTA 버튼 `h-12` 최소 보장 | Low | 다수 모달 |

### 3.2 Non-Functional Requirements

| 카테고리 | 기준 | 측정 방법 |
|---------|------|----------|
| 터치 타겟 | 모든 인터랙티브 요소 ≥ 44×44px | 개발자 도구 Inspect |
| 가독성 | 최소 폰트 크기 12px (text-xs) | Grep text-\[10px\] 0건 |
| iOS 대응 | safe-area-inset 적용 | iPhone 실기기 또는 시뮬레이터 확인 |
| TypeScript | tsc --noEmit 0 error | CI |
| 빌드 | Vite 빌드 성공 | npm run build |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-05 구현 완료
- [ ] `grep -r 'text-\[10px\]' components/` → 0건
- [ ] 모든 모달 닫기 버튼 ≥ 44px
- [ ] TypeScript 에러 0건
- [ ] Vite 빌드 성공

### 4.2 Quality Criteria

- [ ] 기존 테스트 137/137 PASS
- [ ] 린트 에러 0건
- [ ] verify:premerge 통과

---

## 5. Risks and Mitigation

| 리스크 | 영향 | 가능성 | 완화 방법 |
|--------|------|--------|----------|
| text-[10px] 치환 후 레이아웃 깨짐 | Medium | Medium | 시각적 확인, sm: 분기 유지 |
| safe-area 적용 후 모달 높이 변경 | Low | Low | dvh 단위 유지로 자동 보정 |
| bottom-sheet 전환 후 데스크톱 레이아웃 변경 | Low | Low | `sm:` 프리픽스로 데스크톱 별도 처리 |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — 기존 코드베이스 유지, UI 컴포넌트 수정만 해당

### 6.2 Key Architectural Decisions

| 결정 | 선택 | 이유 |
|------|------|------|
| safe-area 방식 | CSS env() 인라인 스타일 또는 Tailwind arbitrary | ModalShell props 확장 최소화 |
| bottom-sheet 분기 | sm: 브레이크포인트 (기존 패턴 통일) | BaseStockModal 패턴 재사용 |
| 폰트 치환 범위 | text-[10px] 전수, text-[11px] 케이스별 검토 | 레이아웃 영향 최소화 |

---

## 7. Convention Prerequisites

기존 CLAUDE.md 규칙 준수:
- Tailwind CSS 사용
- `sm:` 단일 브레이크포인트 전략
- ModalShell 기반 모달 구조

---

## 8. Implementation Order

1. **FR-01**: 모달 닫기 버튼 터치 타겟 (영향 범위 넓음, 단순 작업)
2. **FR-02**: ModalShell safe-area 대응 (1개 파일, 효과 큼)
3. **FR-03**: text-[10px] 전수 치환 (grep 기반, 빠른 처리)
4. **FR-05**: 3개 모달 bottom-sheet 전환 (패턴 반복)
5. **FR-04**: 차트 스크롤 힌트 (독립적, 마지막)
6. **FR-06·07**: 문서화·버튼 표준화

## 9. Next Steps

1. [ ] Design 문서 작성 (`mobile-ux-fix.design.md`)
2. [ ] 구현 시작
3. [ ] Gap 분석 (`/pdca analyze mobile-ux-fix`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | 모바일 전수 분석 기반 초안 | AI |
