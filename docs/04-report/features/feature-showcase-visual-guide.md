# feature-showcase Visual Implementation Guide

**Date**: 2026-02-22
**Status**: COMPLETE & DEPLOYED
**URL**: https://inventory.denjoy.info

---

## Layout Architecture

### Desktop View (md: 768px+)

```
┌────────────────────────────────────────────────────────────────┐
│              KEY FEATURES Section (bg-slate-50)                │
├────────────────────────────────────────────────────────────────┤
│  Key Features                                                   │
│  병원 운영의 품격을 높이는 기능                                 │
│  치과 임플란트 관리의 모든 것을 하나로                           │
├────────────────────────────────────────────────────────────────┤
│  Grid: grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6               │
├────────────────────────┬──────────────┬──────────────┐         │
│                        │              │              │         │
│     CARD 1             │   CARD 2     │   CARD 3     │         │
│                        │              │              │         │
│  (hero gradient)       │  (emerald)   │  (rose)      │         │
│  row-span-2            │              │              │         │
│                        ├──────────────┼──────────────┤         │
│                        │              │              │         │
│                        │   CARD 4     │   CARD 5     │         │
│                        │              │              │         │
│                        │  (amber)     │  (sky)       │         │
├────────────────────────┴──────────────┴──────────────┤         │
│                                                      │         │
│                     CARD 6 (purple, col-span-3)     │         │
│              [horizontal layout with stats]         │         │
│                                                      │         │
└────────────────────────────────────────────────────────────────┘
```

### Mobile View (< md: 768px)

```
┌─────────────────┐
│   CARD 1        │
│  (gradient)     │
├─────────────────┤
│   CARD 2        │
│  (emerald)      │
├─────────────────┤
│   CARD 3        │
│  (rose)         │
├─────────────────┤
│   CARD 4        │
│  (amber)        │
├─────────────────┤
│   CARD 5        │
│  (sky)          │
├─────────────────┤
│   CARD 6        │
│  (purple)       │
│  [vertical]     │
└─────────────────┘
```

---

## Card Specifications

### Card 1: 실시간 재고 & 자동 차감

**Type**: Hero Card (double height on md+)

**Visual**:
```
┌─────────────────────────────────────┐
│ ◆ [indigo→purple gradient]          │
│                                     │
│   📊 (icon in white/20%)            │
│   • 가장 인기 있는 기능              │
│                                     │
│   실시간 재고 & 자동 차감            │
│   수술 기록을 업로드하면 재고가      │
│   자동으로 차감됩니다.              │
│   ─────────────────────────          │
│   | 업로드 후 30초 |                │
│   | 14개 브랜드 | 실시간 알림 |      │
│                                     │
└─────────────────────────────────────┘

Colors:
  - Background: from-indigo-600 to-purple-600
  - Text: white / indigo-100
  - Icon bg: white/20 (backdrop blur)
  - Stat chips: white/15
```

**HTML Structure**:
```tsx
<div className="group relative p-5 sm:p-8 bg-gradient-to-br from-indigo-600 to-purple-600
                rounded-[2rem] shadow-xl shadow-indigo-200 text-white overflow-hidden
                md:row-span-2 flex flex-col">
  {/* Decorative background elements */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[2rem] -mr-8 -mt-8"></div>
  <div className="absolute inset-0 bg-[url('...')] opacity-10"></div>

  {/* Content container */}
  <div className="relative z-10 flex flex-col flex-1">
    {/* Icon */}
    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 sm:mb-6">
      <svg>/* bar chart icon */</svg>
    </div>

    {/* Badge */}
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20
                    text-xs font-bold mb-4 w-fit">
      <span className="w-1.5 h-1.5 bg-amber-300 rounded-full"></span>
      가장 인기 있는 기능
    </div>

    {/* Title */}
    <h3 className="text-lg sm:text-xl font-bold mb-3 text-balance">
      실시간 재고 & 자동 차감
    </h3>

    {/* Description */}
    <p className="text-indigo-100 leading-relaxed text-balance flex-1">
      수술 기록을 업로드하면 재고가 자동으로 차감됩니다.
      브랜드/사이즈별 현재고를 한눈에 파악하고, 부족 시 즉시 알림을 받으세요.
    </p>

    {/* Stat chips at bottom */}
    <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/20">
      {['업로드 후 30초', '14개 브랜드', '실시간 알림'].map(stat => (
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

### Cards 2-5: Standard Feature Cards

**Type**: Icon + Title + Description + Hover Effects

**Card 2: 수술 통계 & 임상 분석 (NEW)**

```
┌──────────────────────┐
│ ◆ [emerald bg]       │
│                      │
│   📈 (emerald icon)  │
│   [NEW] badge        │
│                      │
│   수술 통계 &         │
│   임상 분석           │
│                      │
│   월별 수술 트렌드,  │
│   제조사별 점유율,   │
│   식립 위치 분석까지. │
│                      │
│   ◆ Hover:          │
│   └─ shadow-xl      │
│   └─ icon scale-110 │
│   └─ bg emerald-100 │
└──────────────────────┘

Colors:
  - Background: white, border-slate-200
  - Corner accent: bg-emerald-50
  - Icon bg: bg-emerald-50, text-emerald-600
  - Badge: bg-emerald-100, text-emerald-700
  - Hover: scale-110, bg-emerald-100
```

**Card 3: FAIL 완전 추적**

```
Colors:
  - Background: white, border-slate-200
  - Corner accent: bg-rose-50
  - Icon bg: bg-rose-50, text-rose-600
  - Hover: scale-110, bg-rose-100
```

**Card 4: 스마트 발주 추천**

```
Colors:
  - Background: white, border-slate-200
  - Corner accent: bg-amber-50
  - Icon bg: bg-amber-50, text-amber-600
  - Hover: scale-110, bg-amber-100
```

**Card 5: 재고 실사 & 불일치 감지**

```
Colors:
  - Background: white, border-slate-200
  - Corner accent: bg-sky-50
  - Icon bg: bg-sky-50, text-sky-600
  - Hover: scale-110, bg-sky-100
```

**HTML Pattern** (Cards 2-5):
```tsx
<div className="group relative p-5 sm:p-8 bg-white rounded-[2rem]
                hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden">
  {/* Corner accent decoration */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-{color}-50 rounded-bl-[2rem]
                  -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-{color}-100"></div>

  <div className="relative z-10">
    {/* Icon */}
    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-{color}-50 shadow-sm mb-4 sm:mb-6
                    text-{color}-600 flex items-center justify-center
                    group-hover:scale-110 transition-transform duration-300">
      <svg>/* icon */</svg>
    </div>

    {/* Badge (Card 2 only) */}
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-{color}-100 text-{color}-700 text-[11px] font-bold mb-3">
      {badge}
    </div>

    {/* Title */}
    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 text-balance">
      {title}
    </h3>

    {/* Description */}
    <p className="text-slate-500 leading-relaxed text-balance">
      {description}
    </p>
  </div>
</div>
```

---

### Card 6: 스마트 데이터 정규화 (Wide)

**Type**: Wide Feature Card with Horizontal Layout

**Visual**:
```
┌──────────────────────────────────────────────┐
│ ◆ [purple bg]                                │
│                                              │
│  [Icon] | 스마트 데이터 정규화              │
│  (16px) |  다양한 제조사와 브랜드의         │
│         |  파편화된 이름을 표준 규격으로     │
│         |  자동 변환합니다. 오타 자동       │
│         |  수정으로 데이터 정확도 99.9%.    │
│         |                                    │
│         | 14개      99.9%      자동          │
│         | 지원 브랜드 데이터정확도 오타수정 │
│                                              │
│ ◆ Mobile (flex-col):                        │
│   [Icon] [title + desc] [stats]             │
│   stacked vertically                        │
└──────────────────────────────────────────────┘

Colors:
  - Background: white, border-slate-200
  - Corner accent: bg-purple-50
  - Icon bg: bg-purple-50, text-purple-600
  - Stat text: text-purple-600, text-2xl font-extrabold
  - Divider: border-l border-slate-100 (sm+)
  - Hover: scale-110, bg-purple-100
```

**HTML Structure**:
```tsx
<div className="group relative p-5 sm:p-8 bg-white rounded-[2rem]
                hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden
                md:col-span-3">
  {/* Corner accent */}
  <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50 rounded-bl-[3rem]
                  -mr-10 -mt-10 transition-all group-hover:scale-110 group-hover:bg-purple-100"></div>

  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
    {/* Left: Icon + Text */}
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

    {/* Right: Stat Numbers */}
    <div className="flex sm:flex-col gap-4 sm:gap-4 sm:border-l sm:border-slate-100
                    sm:pl-10 flex-shrink-0">
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

## Color Palette

| Card | Accent | Icon BG | Icon Text | Hover BG | Badge |
|------|--------|---------|-----------|----------|-------|
| 1 | gradient (indigo→purple) | white/20 | white | — | white/20 |
| 2 | emerald | emerald-50 | emerald-600 | emerald-100 | emerald-100 |
| 3 | rose | rose-50 | rose-600 | rose-100 | — |
| 4 | amber | amber-50 | amber-600 | amber-100 | — |
| 5 | sky | sky-50 | sky-600 | sky-100 | — |
| 6 | purple | purple-50 | purple-600 | purple-100 | — |

---

## Icon Assets

All icons are inline SVG (no image files):

| Card | Icon Name | Path Description |
|------|-----------|------------------|
| 1 | Bar Chart | `M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586...` |
| 2 | Trending Up | `M13 7h8m0 0v8m0-8l-8 8-4-4-6 6` |
| 3 | Shield | `M20.618 5.984A11.955 11.955 0 0112 2.944a11.955...` |
| 4 | Cube | `M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4` |
| 5 | Clipboard Check | `M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10...m-6 9l2 2 4-4` |
| 6 | Beaker (Lab) | `M19.428 15.428a2 2 0 00-1.022-.547l-2.384...` |

---

## Responsive Breakpoints

| Breakpoint | CSS | Card 1 | Cards 2-5 | Card 6 |
|------------|-----|--------|----------|--------|
| **Mobile** | `grid-cols-1` | 1 col | 1 col | 1 col (vertical) |
| **sm (640px)** | `grid-cols-1` | 1 col | 1 col | horizontal layout |
| **md (768px)** | `md:grid-cols-3` | col-1 row-2 | 2x2 grid | col-span-3 |
| **lg (1024px)** | `md:grid-cols-3` | col-1 row-2 | 2x2 grid | col-span-3 |

---

## Animation & Interaction

### Hover Effects

**All Cards (except Card 1)**:
```css
/* On group:hover */
.group:hover {
  box-shadow: var(--shadow-xl);  /* shadow-xl */
  transition: all 300ms;           /* transition-all duration-300 */
}

/* Icon on group:hover */
.group:hover .icon {
  transform: scale(1.1);           /* group-hover:scale-110 */
  transition: transform 300ms;     /* transition-transform duration-300 */
}

/* Corner accent on group:hover */
.group:hover .accent {
  transform: scale(1.1);           /* group-hover:scale-110 */
  background: lighter color;       /* group-hover:bg-{color}-100 */
  transition: all 300ms;
}
```

**Card 1**: No hover effects (fixed gradient)

### Transition Classes
- `transition-all duration-300`: Smooth hover effects
- `transition-transform duration-300`: Smooth icon scaling
- `group-hover`: Parent-scoped hover state (Tailwind v3+)

---

## Copy Content

### Section Header
```
KEY FEATURES (label, uppercase, text-indigo-600)
병원 운영의 품격을 높이는 기능 (title)
치과 임플란트 관리의 모든 것을 하나로 (subtitle)
```

### Card Titles & Descriptions

**Card 1**:
- Title: 실시간 재고 & 자동 차감
- Badge: 가장 인기 있는 기능
- Description: 수술 기록을 업로드하면 재고가 자동으로 차감됩니다. 브랜드/사이즈별 현재고를 한눈에 파악하고, 부족 시 즉시 알림을 받으세요.
- Stats: 업로드 후 30초, 14개 브랜드, 실시간 알림

**Card 2**:
- Title: 수술 통계 & 임상 분석
- Badge: NEW
- Description: 월별 수술 트렌드, 제조사별 점유율, 식립 위치 분석까지. 데이터로 임상 패턴을 파악하고 발주 계획에 활용하세요.

**Card 3**:
- Title: FAIL 완전 추적
- Description: 수술 중 FAIL → 교환 접수 → 입고 확인까지 단계별 추적. 브랜드별 FAIL률을 자동으로 계산합니다.

**Card 4**:
- Title: 스마트 발주 추천
- Description: 소모 패턴 기반 적정 재고 자동 계산. 원클릭 발주 생성으로 과주문·품절을 방지하세요.

**Card 5**:
- Title: 재고 실사 & 불일치 감지
- Description: 실물 재고와 시스템 재고를 비교합니다. 불일치 항목을 즉시 파악하고 실사 이력을 관리하세요.

**Card 6**:
- Title: 스마트 데이터 정규화
- Description: 다양한 제조사와 브랜드의 파편화된 이름을 표준 규격으로 자동 변환합니다. 오타 자동 수정으로 데이터 정확도 99.9%.
- Stats: 14개 (지원 브랜드), 99.9% (데이터 정확도), 자동 (오타 수정)

---

## Build & Performance

### CSS Framework
- **Tailwind CSS v4.1.18**
- **Bundle Impact**: 0 bytes (all classes already in build)
- **Icon Impact**: 0 bytes (inline SVG, no image files)

### Code Metrics
- **Total lines**: +140 (6 cards + header)
- **TypeScript**: All valid, 0 errors
- **Build Status**: PASSING
- **Deployed**: https://inventory.denjoy.info

### Performance Checklist
- [x] No new HTTP requests (icons are inline)
- [x] No image assets (SVG only)
- [x] CSS classes optimized (Tailwind purge)
- [x] Responsive design (mobile-first)
- [x] Accessibility (semantic HTML, ARIA)

---

## Implementation Checklist

- [x] Section header with subtitle added
- [x] Grid layout changed to `md:grid-cols-3`
- [x] Card 1: Hero layout with `md:row-span-2 flex flex-col`
- [x] Card 1: Stat chips at bottom (3 metrics)
- [x] Card 2: NEW card with emerald accent + badge
- [x] Card 3: FAIL card with rose accent
- [x] Card 4: NEW card with amber accent
- [x] Card 5: NEW card with sky accent
- [x] Card 6: Wide card with `md:col-span-3` + horizontal layout
- [x] All icons implemented (6 unique SVG)
- [x] All hover effects working (shadow, scale, bg color)
- [x] Mobile responsive (1-col stack)
- [x] md+ responsive (Bento grid)
- [x] Build passed
- [x] Deployed to production

---

## Next Steps

1. Monitor analytics for feature showcase section engagement
2. Plan Phase 2: Tabbed showcase with app screenshots
3. Consider A/B testing: 3-card vs 6-card layout
4. Plan animation enhancements: scroll triggers, etc.

---

**Document**: Feature Showcase Visual Guide
**Status**: COMPLETE
**Date**: 2026-02-22
**URL**: https://inventory.denjoy.info
