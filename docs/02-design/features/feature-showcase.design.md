# Design: feature-showcase

## 수정 대상
- **파일**: `components/LandingPage.tsx`
- **대상 섹션**: `<section id="features">` (line 343–408)
- **변경 범위**: 해당 섹션 전체 교체

---

## 1. 섹션 헤더 변경

```tsx
// Before
<h2>Key Features</h2>
<p>병원 운영의 품격을 높이는 기능</p>

// After — 부제 1줄 추가
<h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase">Key Features</h2>
<p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">
  병원 운영의 품격을 높이는 기능
</p>
<p className="mt-3 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
  치과 임플란트 관리의 모든 것을 하나로
</p>
```

---

## 2. Bento Grid 레이아웃

```
mobile (1-col):  Card1 / Card2 / Card3 / Card4 / Card5 / Card6

md+ (3-col):
┌──────────────┬──────────┬──────────┐  ← Row 1
│              │  Card 2  │  Card 3  │
│   Card 1     ├──────────┼──────────┤  ← Row 2
│ (row-span-2) │  Card 4  │  Card 5  │
├──────────────┴──────────┴──────────┤  ← Row 3
│          Card 6 (col-span-3)        │
└────────────────────────────────────┘
```

**Grid CSS:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
  <div className="md:row-span-2">   {/* Card 1 */} </div>
  <div>                             {/* Card 2 */} </div>
  <div>                             {/* Card 3 */} </div>
  <div>                             {/* Card 4 */} </div>
  <div>                             {/* Card 5 */} </div>
  <div className="md:col-span-3">  {/* Card 6 */} </div>
</div>
```

---

## 3. 카드별 상세 스펙

### Card 1 — 실시간 재고 & 자동 차감 (Hero)
**스타일**: 기존 indigo→purple 그라디언트 유지, 하단에 stat chips 3개 추가

```tsx
<div className="group relative p-5 sm:p-8 bg-gradient-to-br from-indigo-600 to-purple-600
                rounded-[2rem] shadow-xl shadow-indigo-200 text-white overflow-hidden
                md:row-span-2 flex flex-col">
  {/* 배경 장식 */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[2rem] -mr-8 -mt-8" />
  <div className="absolute inset-0 bg-[url('...')] opacity-10" />

  <div className="relative z-10 flex flex-col flex-1">
    {/* 아이콘 (기존 유지) */}
    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 sm:mb-6
                    flex items-center justify-center">
      <svg>/* bar chart icon */</svg>
    </div>

    {/* 배지 (기존 유지) */}
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20
                    text-xs font-bold mb-4 w-fit">
      <span className="w-1.5 h-1.5 bg-amber-300 rounded-full" />
      가장 인기 있는 기능
    </div>

    {/* 제목 */}
    <h3 className="text-lg sm:text-xl font-bold mb-3 text-balance">
      실시간 재고 & 자동 차감
    </h3>

    {/* 설명 */}
    <p className="text-indigo-100 leading-relaxed text-balance flex-1">
      수술 기록을 업로드하면 재고가 자동으로 차감됩니다.
      브랜드/사이즈별 현재고를 한눈에 파악하고, 부족 시 즉시 알림을 받으세요.
    </p>

    {/* NEW: Stat Chips (하단 고정) */}
    <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/20">
      {["업로드 후 30초", "14개 브랜드", "실시간 알림"].map(stat => (
        <span key={stat} className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold
                                     text-white/90 backdrop-blur-sm">
          {stat}
        </span>
      ))}
    </div>
  </div>
</div>
```

---

### Card 2 — 수술 통계 & 임상 분석 (NEW)
**색상**: emerald accent / `bg-emerald-50`

```tsx
<div className="group relative p-5 sm:p-8 bg-white rounded-[2rem]
                hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden">
  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[2rem]
                  -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-emerald-100" />
  <div className="relative z-10">
    {/* 아이콘 */}
    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-emerald-50 shadow-sm mb-4 sm:mb-6
                    text-emerald-600 flex items-center justify-center
                    group-hover:scale-110 transition-transform duration-300">
      <svg>/* chart/analytics icon: M9 19v-6a2 2 0 00-2-2H5... (trending up) */</svg>
    </div>

    {/* NEW 배지 */}
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-emerald-100 text-emerald-700 text-[11px] font-bold mb-3">
      NEW
    </div>

    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 text-balance">
      수술 통계 & 임상 분석
    </h3>
    <p className="text-slate-500 leading-relaxed text-balance">
      월별 수술 트렌드, 제조사별 점유율, 식립 위치 분석까지.
      데이터로 임상 패턴을 파악하고 발주 계획에 활용하세요.
    </p>
  </div>
</div>
```

---

### Card 3 — FAIL 완전 추적
**색상**: rose accent / `bg-rose-50`
(기존 "FAIL 관리 & 발주 추적"을 분리 + copy 강화)

```tsx
// 색상: rose (text-rose-600, bg-rose-50)
// 아이콘: shield-exclamation 또는 x-circle
<h3>FAIL 완전 추적</h3>
<p>
  수술 중 FAIL → 교환 접수 → 입고 확인까지 단계별 추적.
  브랜드별 FAIL률을 자동으로 계산합니다.
</p>
```

---

### Card 4 — 스마트 발주 추천
**색상**: amber accent / `bg-amber-50`

```tsx
// 색상: amber (text-amber-600, bg-amber-50)
// 아이콘: shopping-bag 또는 cube
<h3>스마트 발주 추천</h3>
<p>
  소모 패턴 기반 적정 재고 자동 계산.
  원클릭 발주 생성으로 과주문·품절을 방지하세요.
</p>
```

---

### Card 5 — 재고 실사 & 불일치 감지
**색상**: sky/cyan accent / `bg-sky-50`

```tsx
// 색상: sky (text-sky-600, bg-sky-50)
// 아이콘: clipboard-check
<h3>재고 실사 & 불일치 감지</h3>
<p>
  실물 재고와 시스템 재고를 비교합니다.
  불일치 항목을 즉시 파악하고 실사 이력을 관리하세요.
</p>
```

---

### Card 6 — 스마트 데이터 정규화 (Wide)
**레이아웃**: 가로 배치 (sm 이상). 좌측 아이콘+텍스트, 우측 stat chips 3개
**색상**: purple accent (기존 Feature 2 색상)

```tsx
<div className="group relative p-5 sm:p-8 bg-white rounded-[2rem]
                hover:shadow-xl transition-all duration-300 border border-slate-200
                overflow-hidden md:col-span-3">
  <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50 rounded-bl-[3rem]
                  -mr-10 -mt-10 transition-all group-hover:scale-110 group-hover:bg-purple-100" />

  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
    {/* 좌측: 아이콘 + 텍스트 */}
    <div className="flex items-start gap-4 sm:gap-6 flex-1">
      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-purple-50 shadow-sm
                      text-purple-600 flex items-center justify-center flex-shrink-0
                      group-hover:scale-110 transition-transform duration-300">
        <svg>/* beaker/lab icon */</svg>
      </div>
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 text-balance">
          스마트 데이터 정규화
        </h3>
        <p className="text-slate-500 leading-relaxed text-balance">
          다양한 제조사와 브랜드의 파편화된 이름을 표준 규격으로 자동 변환합니다.
          오타 자동 수정으로 데이터 정확도 99.9%.
        </p>
      </div>
    </div>

    {/* 우측: Stat chips (구분선 포함) */}
    <div className="flex sm:flex-col gap-2 sm:gap-3 sm:border-l sm:border-slate-100
                    sm:pl-8 flex-shrink-0">
      {[
        { value: "14개", label: "지원 브랜드" },
        { value: "99.9%", label: "데이터 정확도" },
        { value: "자동", label: "오타 수정" },
      ].map(({ value, label }) => (
        <div key={label} className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl font-extrabold text-purple-600 leading-none">
            {value}
          </span>
          <span className="text-xs text-slate-400 font-medium leading-tight">{label}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```

---

## 4. 아이콘 SVG 경로 정의

| 카드 | 아이콘 | SVG path |
|------|--------|----------|
| 1 | 차트/문서 | `M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586...` (기존 유지) |
| 2 | 트렌드 상승 | `M13 7h8m0 0v8m0-8l-8 8-4-4-6 6` (trending-up) |
| 3 | 방패/경고 | `M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01` |
| 4 | 큐브/박스 | `M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4` (cube) |
| 5 | 클립보드 체크 | `M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4` |
| 6 | 비커/실험 | `M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517...` (기존 Feature2 유지) |

---

## 5. 색상 시스템

| 카드 | accent | bg-light | text | hover-bg |
|------|--------|----------|------|----------|
| 1 | gradient | — | white | — (고정) |
| 2 | emerald-600 | emerald-50 | slate-900 | emerald-100 |
| 3 | rose-600 | rose-50 | slate-900 | rose-100 |
| 4 | amber-600 | amber-50 | slate-900 | amber-100 |
| 5 | sky-600 | sky-50 | slate-900 | sky-100 |
| 6 | purple-600 | purple-50 | slate-900 | purple-100 |

---

## 6. 구현 순서

1. `<section id="features">` 전체 찾기 (line 343–408)
2. 섹션 헤더에 부제 추가
3. `grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6` 로 변경
4. 카드 1: `md:row-span-2 flex flex-col` 추가, stat chips 하단 추가
5. 카드 2 (신규): 수술 통계 카드 삽입 (NEW 배지, emerald)
6. 카드 3: 기존 FAIL copy 강화 (rose)
7. 카드 4 (신규): 발주 추천 카드 삽입 (amber)
8. 카드 5 (신규): 재고 실사 카드 삽입 (sky)
9. 카드 6: 기존 데이터 정규화 → 와이드 카드로 리디자인 (`md:col-span-3`)

---

## 7. 검증 기준

- [ ] `npm run build` 타입 에러 없음
- [ ] lg (1280px): 2행 3열 + 하단 와이드 카드
- [ ] md (768px): 2행→ Card1 row-span-2로 카드1이 양쪽 카드2,3 높이를 채움
- [ ] mobile (390px): 6개 카드 1열 스택
- [ ] Card 1 stat chips 하단 고정 (flex flex-col flex-1 사용)
- [ ] Card 6 가로 레이아웃 (sm 이상)
- [ ] 기존 hover 인터랙션 유지
