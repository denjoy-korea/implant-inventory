# Design: Surgery Dashboard Upgrade

> Plan 문서 기반 상세 구현 설계. Phase 1 → 2 → 3 순서로 구현한다.

**참조**: `docs/01-plan/features/surgery-dashboard-upgrade.plan.md`

---

## 1. 수정 대상 파일

| 파일 | 역할 | Phase |
|------|------|-------|
| `components/SurgeryDashboard.tsx` | 메인 대시보드 (현재 932줄) | 1, 2, 3 |
| `index.css` | 차트 애니메이션, 유틸리티 CSS | 1, 2 |

---

## 2. Phase 1: Quick Wins (P0)

### 2.1 코드 정리

#### 2.1.1 미사용 state/ref 제거

**현재 (line 84-85)**:
```tsx
const fileInputRef = useRef<HTMLInputElement>(null);  // empty state에서만 선언, 실제 ref 미연결
const [isDragging] = useState(false);                 // setter 없음, 항상 false
```

**변경**:
- `fileInputRef` 완전 제거 (empty state의 `<input ref={fileInputRef}>` 도 함께 제거)
- `isDragging` 완전 제거 → 관련 조건문(`isDragging ? ...`)을 정적 값으로 대체

#### 2.1.2 transition: 'all' 제거

**현재 위치 (3곳)**:
| 위치 | 현재 | 변경 |
|------|------|------|
| line 812 (donut path) | `transition: 'all 0.4s cubic-bezier(...)'` | `transition: 'transform 0.4s ..., stroke-width 0.4s ..., stroke-dashoffset 0.4s ...'` |
| line 868 (FAIL bar) | `className="transition-all duration-700"` | `className="transition-[width] duration-700"` |
| line 830 (donut legend) | `className="... transition-colors ..."` | 유지 (이미 명시적) |

#### 2.1.3 sparkline gradient ID 충돌 해결

**현재 (line 61)**:
```tsx
id={`spark-${color.replace('#', '')}`}
```
`#4F46E5` 색상이 3개 카드(총 식립, 월 평균, 일 평균)에서 동일 ID 생성.

**변경**: MiniSparkline에 `id` prop 추가
```tsx
function MiniSparkline({ data, color, id, ... }: { ...; id: string }) {
  // gradient id: `spark-${id}`
}
```
KPI 배열에서 `id: 'placement'`, `id: 'monthly'`, `id: 'fail'`, `id: 'claim'`, `id: 'daily'` 전달.

---

### 2.2 접근성 (A11y)

#### 2.2.1 차트 SVG aria-label

모든 차트 `<svg>`에 적용:

| 차트 | role | aria-label |
|------|------|------------|
| 월별 추세 Bar | `img` | `"월별 식립, 청구, 수술중 FAIL 건수 추이 바 차트"` |
| 요일별 패턴 | `img` | `"요일별 식립 건수 컬럼 차트"` |
| 식립 추세 Line | `img` | `"월별 식립 건수 추세 라인 차트"` |
| 구분별 비율 Ring | `img` | `"식립 대비 청구 비율 링 게이지"` / `"식립 대비 수술중 FAIL 비율 링 게이지"` |
| 제조사 Donut | `img` | `"제조사별 식립 분포 도넛 차트"` |
| 식립부위 Ring | `img` | `"식립 부위별 분포 링 차트"` |

#### 2.2.2 onMouse → onPointer 전환

전체 파일에서 일괄 교체:
- `onMouseEnter` → `onPointerEnter`
- `onMouseLeave` → `onPointerLeave`

이렇게 하면 mouse + touch + pen 모두 지원.

---

### 2.3 정보 강화 (Quick)

#### 2.3.1 TrendBadge에 퍼센트(%) 표시 추가

**현재**: `▲ 15건`
**변경**: `▲ 15건 (+8.5%)`

TrendBadge props 확장:
```tsx
function TrendBadge({ value, prevValue, suffix = '건' }: {
  value: number;
  prevValue?: number;  // NEW: 전월 값
  suffix?: string;
}) {
  const pctChange = prevValue && prevValue > 0
    ? ((value / prevValue - 1) * 100).toFixed(1)
    : null;
  // 렌더: ▲ 15건 (+8.5%)
}
```

sparkline useMemo에서 `prevValue` 계산 추가:
```tsx
placementPrev: prev ? prev['식립'] : 0,
failPrev: prev ? prev['수술중 FAIL'] : 0,
claimPrev: prev ? prev['청구'] : 0,
```

#### 2.3.2 제조사 FAIL률 (건수 → 비율)

**현재**: `manufacturerFailStats`에 FAIL 건수만 표시
**변경**: 해당 제조사의 식립 건수 대비 FAIL 비율 추가

`manufacturerFailStats` useMemo 수정:
```tsx
const manufacturerFailStats = useMemo(() => {
  const failMap: Record<string, number> = {};
  const placeMap: Record<string, number> = {};

  cleanRows.forEach(row => {
    const m = String(row['제조사'] || '기타').trim();
    const cls = String(row['구분'] || '');
    if (cls === '수술중 FAIL') failMap[m] = (failMap[m] || 0) + 1;
    if (cls === '식립') placeMap[m] = (placeMap[m] || 0) + 1;
  });

  return Object.entries(failMap)
    .map(([name, failCount]) => ({
      name,
      failCount,
      placeCount: placeMap[name] || 0,
      failRate: placeMap[name] ? Number(((failCount / placeMap[name]) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.failCount - a.failCount);
}, [cleanRows]);
```

UI 표시 변경:
```
오스템  3건 / 150건 식립  (2.0%)
███████████░░░░░░░░░
```
- 진행바는 `failRate` 기준으로 표시 (최대 FAIL률 기준 상대값)
- 오른쪽: `{failCount}건 / {placeCount}건` + `({failRate}%)`

---

### 2.4 시각 디자인 강화 (Quick)

#### 2.4.1 차트 영역에 dot-grid 배경

`index.css`에 이미 `.chart-dot-grid` 정의됨 (미사용):
```css
.chart-dot-grid {
  background-image: radial-gradient(circle, #e2e8f0 0.5px, transparent 0.5px);
  background-size: 16px 16px;
}
```

적용 대상: 월별 추세 Bar, 식립 추세 Line 차트 카드의 `overflow-x-auto` div에 클래스 추가.

#### 2.4.2 섹션별 좌측 accent border

각 카드의 `rounded-2xl border border-slate-100` 을 유지하면서 좌측에 3px 컬러 바를 추가:

| 섹션 | accent 색상 | CSS |
|------|-------------|-----|
| 월별 추세 | Indigo | `border-l-[3px] border-l-indigo-500` |
| 요일별 패턴 | Indigo | `border-l-[3px] border-l-indigo-300` |
| 식립 추세 | Sky | `border-l-[3px] border-l-sky-500` |
| 구분별 비율 | Violet | `border-l-[3px] border-l-violet-400` |
| 제조사별 분포 | Indigo | `border-l-[3px] border-l-indigo-500` |
| 제조사별 FAIL | Rose | `border-l-[3px] border-l-rose-500` |
| 식립부위 분석 | Emerald | `border-l-[3px] border-l-emerald-500` |

---

## 3. Phase 2: Information Depth (P1)

### 3.1 피크 패턴 인사이트 텍스트

요일별 패턴 차트 하단에 자동 생성 인사이트 추가.

**데이터 계산** (`dayOfWeekStats` 활용):
```tsx
const peakDay = dayOfWeekStats.reduce((a, b) => a.count > b.count ? a : b);
const lowDay = dayOfWeekStats.filter(d => d.count > 0).reduce((a, b) => a.count < b.count ? a : b);
const weekdayTotal = dayOfWeekStats.slice(1, 6).reduce((s, d) => s + d.count, 0);
const weekendTotal = dayOfWeekStats[0].count + dayOfWeekStats[6].count;
```

**UI 표시**:
```
┌────────────────────────────────────┐
│  피크 요일: 화 (91건)              │
│  비수기: 일 (22건)                 │
│  평일 vs 주말: 276건 : 58건        │
└────────────────────────────────────┘
```

위치: SVG 아래, 카드 하단. `text-[10px] text-slate-500` 스타일.

---

### 3.2 치아번호 히트맵 (FDI Notation)

**새로운 섹션**: Deep Analysis 3-column 그리드를 4-column 또는 2행으로 확장하여 배치.

**대안 A (권장)**: 식립부위 분석 카드 내부를 확장. 기존 상악/하악/전치/구치 요약 + 아래에 FDI 히트맵.

**FDI 치아번호 체계**:
```
상악 우측  18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28  상악 좌측
하악 우측  48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38  하악 좌측
```

**데이터 구조** (새 useMemo):
```tsx
const toothHeatmap = useMemo(() => {
  const counts: Record<number, number> = {};
  cleanRows.filter(r => r['구분'] === '식립').forEach(row => {
    const teeth = String(row['치아번호'] || '');
    teeth.split(',').map(t => parseInt(t.trim())).filter(n => !isNaN(n) && n >= 11 && n <= 48)
      .forEach(n => { counts[n] = (counts[n] || 0) + 1; });
  });
  const maxCount = Math.max(...Object.values(counts), 1);
  return { counts, maxCount };
}, [cleanRows]);
```

**시각화 설계**:
- 32개 셀 (4행 8열) 그리드
- 각 셀: 치아번호 + 건수
- 색상 intensity: `opacity = count / maxCount` (0.1 ~ 1.0)
- 배경: Indigo 계열 (`bg-indigo-500` with dynamic opacity)
- 크기: 각 셀 `w-8 h-8` 또는 `w-7 h-7`
- 가운데 세로줄로 좌/우 구분

```
 상악 ──────────────────────
 [18:2] [17:5] [16:12] [15:8] [14:6] [13:3] [12:1] [11:2] │ [21:3] [22:1] [23:4] [24:7] [25:9] [26:15] [27:6] [28:1]
 하악 ──────────────────────
 [48:1] [47:4] [46:14] [45:7] [44:5] [43:2] [42:0] [41:1] │ [31:1] [32:0] [33:3] [34:6] [35:8] [36:16] [37:5] [38:2]
```

**배치 변경**:
- Deep Analysis 그리드를 `grid-cols-3` → 첫 행 `grid-cols-3` + 둘째 행 full-width 치아 히트맵
- 또는 식립부위 분석 카드를 확장하여 `lg:col-span-2`로 넓히고 내부에 히트맵 포함

**권장안**: 식립부위 분석 카드를 `lg:col-span-2`로 변경. 기존 링 차트 + 요약은 좌측, 히트맵은 우측.

```
┌─────────────────┬─────────────────────┬──────────────────────────────────┐
│  제조사별 분포   │  제조사별 FAIL 건수  │  식립 부위 분석 (col-span-2)     │
│  (donut)        │  (progress bars)     │  [링차트+요약] │ [치아 히트맵]   │
└─────────────────┴─────────────────────┴──────────────────────────────────┘
```

→ 수정: `grid-cols-3` → `grid-cols-4`, 식립부위가 2칸 차지.

---

### 3.3 KPI 카드 핵심 메트릭 하이라이트

5개 KPI 중 **총 식립** 카드에 시각적 강조:

**변경**:
```tsx
<div key={i} className={`px-6 py-5 hover:bg-slate-50/50 transition-colors ${
  i === 0 ? 'bg-indigo-50/30 border-r-2 border-r-indigo-200' : ''
}`}>
```

첫 번째 카드(총 식립)에만:
- `bg-indigo-50/30` 배경 tint
- 우측 `border-r-2 border-r-indigo-200` 구분선 강조

---

### 3.4 Deep Analysis 디바이더 강화

**현재**: 텍스트만 (`Deep Analysis` + 좌우 `h-px bg-slate-100`)

**변경**:
```tsx
<div className="flex items-center gap-4 py-6">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
  <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
    <svg className="w-3.5 h-3.5 text-slate-400" ...> {/* 분석 아이콘 */} </svg>
    <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Deep Analysis</span>
  </div>
  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
</div>
```

- gradient 라인으로 페이드 효과
- pill 형태 badge + 아이콘

---

## 4. Phase 3: Advanced Features (P2-P3)

### 4.1 식립 추세 Trendline (선형 회귀)

**계산** (새 useMemo):
```tsx
const trendline = useMemo(() => {
  if (monthlyData.length < 2) return null;
  const n = monthlyData.length;
  const xVals = monthlyData.map((_, i) => i);
  const yVals = monthlyData.map(d => d['식립']);
  const sumX = xVals.reduce((a, b) => a + b, 0);
  const sumY = yVals.reduce((a, b) => a + b, 0);
  const sumXY = xVals.reduce((a, x, i) => a + x * yVals[i], 0);
  const sumXX = xVals.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}, [monthlyData]);
```

**시각화**: Line Chart SVG에 dashed 선으로 오버레이
```tsx
{trendline && linePoints.length >= 2 && (
  <line
    x1={linePoints[0].x}
    y1={linePad.t + linePlotH - ((trendline.intercept) / niceLineMax) * linePlotH}
    x2={linePoints[linePoints.length - 1].x}
    y2={linePad.t + linePlotH - ((trendline.slope * (linePoints.length - 1) + trendline.intercept) / niceLineMax) * linePlotH}
    stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="8 4" opacity={0.6}
  />
)}
```

추세선 우측에 라벨: `"Trend"` + slope 방향 표시 (`↗ +2.3/월` 또는 `↘ -1.1/월`)

---

### 4.2 숫자 카운트업 애니메이션

**새 훅**: `useCountUp`
```tsx
function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    let start = 0;
    const startTime = performance.now();
    const step = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return current;
}
```

적용 대상: KPI 카드 5종의 큰 숫자 (`text-3xl`).
`prefers-reduced-motion` 시 즉시 최종값 표시.

---

### 4.3 컴포넌트 분리 구조 (Phase 3)

> Phase 3에서 실행. 현재 932줄 → 파일별 분리.

```
components/
├── SurgeryDashboard.tsx          (메인 오케스트레이터, ~250줄)
├── surgery/
│   ├── KPIStrip.tsx              (KPI 5종 + sparkline)
│   ├── MonthlyBarChart.tsx       (월별 추세 Bar)
│   ├── DayOfWeekChart.tsx        (요일별 패턴)
│   ├── PlacementLineChart.tsx    (식립 추세 Line + trendline)
│   ├── ClassificationRatios.tsx  (구분별 비율 Ring)
│   ├── ManufacturerDonut.tsx     (제조사 분포 Donut)
│   ├── ManufacturerFail.tsx      (제조사 FAIL)
│   ├── ToothHeatmap.tsx          (치아번호 히트맵)
│   └── hooks/
│       ├── useSurgeryData.ts     (데이터 가공 useMemo 모음)
│       └── useCountUp.ts         (카운트업 애니메이션)
```

**분리 원칙**:
- 각 차트 컴포넌트는 가공된 데이터를 props로 받음
- 데이터 가공 로직은 `useSurgeryData` 커스텀 훅으로 이동
- 색상 상수(`CLASSIFICATION_COLORS`, `DONUT_COLORS`)는 `SurgeryDashboard.tsx`에 유지 또는 별도 `constants.ts`

---

## 5. 구현 순서 체크리스트

### Phase 1 (P0 Quick Wins)
- [ ] 1-1. `fileInputRef`, `isDragging` 제거
- [ ] 1-2. `transition: 'all'` → 명시적 속성 3곳
- [ ] 1-3. MiniSparkline `id` prop 추가, gradient ID 유니크화
- [ ] 1-4. 모든 차트 SVG에 `role="img"` + `aria-label`
- [ ] 1-5. `onMouseEnter/Leave` → `onPointerEnter/Leave` 일괄 교체
- [ ] 1-6. TrendBadge에 % 변화율 추가
- [ ] 1-7. manufacturerFailStats → failRate 계산 포함
- [ ] 1-8. 차트 카드에 `chart-dot-grid` 배경 적용
- [ ] 1-9. 카드별 좌측 accent border 추가

### Phase 2 (P1 Info Depth)
- [ ] 2-1. 요일별 패턴 인사이트 텍스트 (피크/비수기/평일vs주말)
- [ ] 2-2. toothHeatmap useMemo + FDI 히트맵 UI
- [ ] 2-3. Deep Analysis 3-col → 4-col (식립부위 col-span-2)
- [ ] 2-4. KPI 첫 번째 카드 시각 강조
- [ ] 2-5. Deep Analysis 디바이더 pill + gradient line

### Phase 3 (P2-P3 Advanced)
- [ ] 3-1. trendline 선형 회귀 계산 + Line Chart 오버레이
- [ ] 3-2. useCountUp 훅 + KPI 숫자 애니메이션
- [ ] 3-3. 컴포넌트 분리 리팩토링

---

## 6. 검증 기준

| 항목 | 기준 |
|------|------|
| TypeScript | `npm run typecheck` 통과 |
| 접근성 | 모든 차트 SVG에 `role="img"` + `aria-label` 존재 |
| transition:all | 파일 내 `transition: 'all` 또는 `transition-all` 0건 |
| 터치 | `onMouseEnter` / `onMouseLeave` 0건 (모두 pointer로 교체) |
| 정보 추가 | FAIL률(%), MoM%, 피크 인사이트, 치아 히트맵 표시 |
| 시각 구분 | 각 카드에 좌측 accent border 존재 |
| gradient ID | 동일 색상 sparkline에서 ID 충돌 없음 |

---

**Created**: 2026-02-16
**Feature**: surgery-dashboard-upgrade
**Phase**: Design
**Status**: Draft
**Ref**: Plan → `docs/01-plan/features/surgery-dashboard-upgrade.plan.md`
