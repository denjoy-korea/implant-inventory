# Plan: Surgery Dashboard Upgrade

> 수술기록 데이터베이스 대시보드의 디자인 품질과 정보 제공 수준을 프로덕션 그레이드로 끌어올린다.

## 1. 현황 분석 (As-Is)

### 현재 점수: 7.1 / 10

| 기준 | 점수 | 핵심 문제 |
|------|------|-----------|
| 정보 구조 | 8.5 | KPI → 추세 → 비율 → 심층분석 흐름은 양호 |
| 시각 디자인 | 7.0 | 깔끔하지만 차별성 없음. "Tailwind 기본 대시보드" 느낌 |
| 인터랙션 | 7.5 | hover 우수하나 터치/키보드 미지원 |
| 접근성 | 5.0 | 차트 aria-label 없음, 키보드 네비게이션 불가 |
| 코드 품질 | 7.5 | 미사용 state, transition:all, gradient ID 충돌 |

### 현재 제공 정보

| 섹션 | 정보 | 한계 |
|------|------|------|
| KPI 5종 | 총 식립, 월평균, FAIL률, 보험청구, 일평균 | 목표 대비 달성률 없음, 기간 비교 없음 |
| 월별 추세 Bar | 식립/청구/FAIL 3종 월별 추이 | 전년 동기 대비 없음, 성장률 표시 없음 |
| 요일별 패턴 | 요일별 식립 건수 | 패턴 해석(피크/비수기) 텍스트 없음 |
| 식립 추세 Line | 식립 건수 월별 라인 | 추세선(trendline) 없음, 예측 없음 |
| 구분별 비율 | 식립vs청구, 식립vsFAIL 링 게이지 | 정적 표시만, 기간별 변화 추세 없음 |
| 제조사별 분포 | 도넛 차트 | 변화 추이 없음 |
| 제조사별 FAIL | 수평 진행바 | FAIL율(%) 미표시, 제조사별 식립수 대비 비율 없음 |
| 식립부위 분석 | 상악/하악/전치/구치 링 | 치아 번호별 히트맵 없음 |

## 2. 목표 (To-Be)

### 목표 점수: 9.0+ / 10

### 2.1 정보 수준 강화 (Information Depth)

| 우선순위 | 개선 항목 | 설명 | 난이도 |
|----------|-----------|------|--------|
| P0 | **KPI 목표 달성률** | 월간 목표 식립 건수 설정 → 달성률 게이지 표시 | M |
| P0 | **기간 비교 (MoM/YoY)** | 전월 대비, 전년 동기 대비 증감률 badge | S |
| P1 | **제조사 FAIL률** | FAIL 건수 대신 `FAIL건수/식립건수 × 100%` 비율 표시 | S |
| P1 | **피크 패턴 인사이트** | "가장 바쁜 요일: 화요일 (91건)", "비수기: 일요일" 텍스트 | S |
| P1 | **치아번호 히트맵** | FDI 표기법 기반 상악/하악 치아 위치별 식립 빈도 시각화 | L |
| P2 | **추세선 (Trendline)** | 식립 추세 Line Chart에 선형 회귀 추세선 오버레이 | M |
| P2 | **누적 식립 카운터** | 전체 기간 누적 식립 수 + 마일스톤 표시 (100건, 500건 등) | S |
| P3 | **AI 인사이트 요약** | 데이터 패턴 자동 분석 텍스트 (예: "최근 3개월 FAIL률 하락 추세") | L |

### 2.2 시각 디자인 강화 (Visual Design)

| 우선순위 | 개선 항목 | 설명 |
|----------|-----------|------|
| P0 | **차트 배경 depth** | dot-grid 패턴, subtle gradient 등으로 깊이감 |
| P0 | **섹션 시각 구분** | 현재 모든 카드가 동일 → accent 색상 또는 좌측 border로 구분 |
| P1 | **KPI 카드 강조** | 핵심 KPI(총 식립)에 시각적 강조 - 더 큰 카드 또는 accent |
| P1 | **차트 컬러 팔레트 확장** | 현재 5색 → 차트별 맥락에 맞는 색상 그라데이션 |
| P2 | **Deep Analysis 디바이더** | 텍스트만 → 아이콘 + 배경 패턴 또는 gradient line |
| P2 | **마이크로 인터랙션** | 숫자 카운트업 애니메이션, 카드 진입 stagger |

### 2.3 접근성 & 인터랙션 (A11y & Interaction)

| 우선순위 | 개선 항목 | 설명 |
|----------|-----------|------|
| P0 | **차트 aria-label** | 모든 SVG 차트에 `role="img"` + `aria-label` 설명 |
| P0 | **transition:all 제거** | 명시적 속성 (`transform, opacity, stroke-width`) 으로 변경 |
| P1 | **키보드 네비게이션** | 차트 데이터 포인트에 `tabIndex` + `onKeyDown` 지원 |
| P1 | **터치 지원** | `onMouseEnter/Leave` → `onPointerEnter/Leave`로 교체 |
| P2 | **스크린 리더 테이블** | 차트 데이터를 `sr-only` 테이블로도 제공 |

### 2.4 코드 품질 (Code Quality)

| 우선순위 | 개선 항목 | 설명 |
|----------|-----------|------|
| P0 | **미사용 state 제거** | `isDragging` (setter 없음), `fileInputRef` (미연결) |
| P0 | **sparkline gradient ID 충돌** | `color + index` 조합으로 유니크 ID 보장 |
| P1 | **컴포넌트 분리** | 930줄 단일 파일 → BarChart, LineChart, DonutChart, KPIStrip 분리 |
| P2 | **CSS 변수 도입** | 하드코딩된 색상 → CSS custom property로 테마화 |

## 3. 구현 우선순위 (Implementation Phases)

### Phase 1: Quick Wins (P0 - 즉시 효과)

> 적은 노력으로 큰 개선 효과

1. 미사용 state/ref 정리 (`isDragging`, `fileInputRef`)
2. `transition: 'all'` → 명시적 속성으로 변경
3. sparkline gradient ID 유니크화
4. 차트 SVG에 `role="img"` + `aria-label` 추가
5. 기간 비교 MoM badge 강화 (전월 대비 % 표시)
6. 제조사 FAIL률 계산 추가 (건수 → 비율)
7. 차트 배경에 dot-grid 패턴 적용

### Phase 2: Information Depth (P1 - 정보 강화)

> 제공 정보의 깊이와 해석력 향상

1. 피크 패턴 인사이트 텍스트
2. 치아번호 히트맵 (FDI notation)
3. KPI 카드 시각 강조 (핵심 메트릭 하이라이트)
4. `onPointerEnter/Leave` 터치 지원
5. 섹션 구분 accent border

### Phase 3: Advanced Features (P2-P3 - 고급 기능)

> 차별화된 경험

1. 추세선 (linear regression) 오버레이
2. 숫자 카운트업 애니메이션
3. 컴포넌트 분리 리팩토링
4. Deep Analysis 디바이더 디자인 강화
5. CSS 변수 기반 테마 시스템

## 4. 기술 제약 사항

| 제약 | 설명 |
|------|------|
| **외부 라이브러리 최소화** | 현재 순수 SVG 기반 차트. Recharts/D3 등 미사용. 유지 |
| **단일 컴포넌트** | 현재 930줄 단일 파일. Phase 2에서 분리 검토 |
| **데이터 소스** | Excel 업로드 기반. 실시간 데이터 아님 |
| **반응형** | Tailwind grid 기반. lg 브레이크포인트 위주 |
| **Vite + React 19** | 빌드 시스템 변경 없음 |

## 5. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 디자인 평가 점수 | 7.1 | 9.0+ |
| 접근성 점수 | 5.0 | 8.0+ |
| 제공 정보 종류 | 8종 | 12종+ |
| 차트 인터랙션 방식 | mouse-only | mouse + touch + keyboard |
| 코드 라인 수 | 930줄 (1파일) | ~600줄 (주) + 서브 컴포넌트 |
| `transition: all` 사용 | 3곳 | 0곳 |

## 6. 예상 작업량

| Phase | 예상 변경 규모 | 파일 수 |
|-------|---------------|---------|
| Phase 1 (Quick Wins) | ~150 lines 변경 | 1-2 files |
| Phase 2 (Info Depth) | ~300 lines 추가/변경 | 2-3 files |
| Phase 3 (Advanced) | ~400 lines 리팩토링 | 5-8 files |

---

**Created**: 2026-02-16
**Feature**: surgery-dashboard-upgrade
**Phase**: Plan
**Status**: Draft
