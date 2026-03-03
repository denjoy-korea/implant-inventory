# DenJOY / DentWeb UI 스타일 가이드

이 프로젝트의 디자인 언어를 재현하기 위한 완전한 레퍼런스입니다.
새 컴포넌트를 만들거나 UI를 수정할 때 반드시 이 문서를 기준으로 합니다.

---

## 1. 기술 스택

- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"`)
- **Font**: `Inter`, `Noto Sans KR` (순서대로 fallback)
- **Animation**: Tailwind `animate-in` + 커스텀 CSS keyframes (`index.css`)

---

## 2. 컬러 팔레트

### 시맨틱 컬러
| 역할 | 클래스 | 용도 |
|------|--------|------|
| Primary | `indigo-600` | 주요 CTA, 활성 상태, 포커스 |
| Danger | `rose-500 / rose-600` | 긴급 알림, 삭제, 교환 대기 |
| Success | `emerald-600` | 완료, 정상, 무료 분석 |
| Warning | `amber-600` | 경고, 재고 부족 주의 |
| Dark CTA | `slate-900` | 반품/주문 같은 진한 버튼 |
| Neutral | `slate-*` | 배경·테두리·텍스트 전반 |

### 배경 계층
```
페이지 배경:     bg-slate-50
카드 배경:       bg-white  (테두리: border-slate-100)
내부 섹션:       bg-slate-50  (테두리: border-slate-100)
입력 필드:       bg-white  (테두리: border-slate-200)
```

### 브랜드 그라디언트 텍스트 (DenJOY 로고 등)
```tsx
style={{
  background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}
```

---

## 3. 타이포그래피

### 이중 레이블 패턴 (한국어 제목 + 영문 서브)
```tsx
<h4 className="text-sm font-black text-slate-800">총 품목</h4>
<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Items</p>
```

### KPI 숫자
```tsx
<p className="text-base font-bold text-slate-800 tracking-tight mt-1">
  {value}
  <span className="text-xs font-semibold text-slate-400 ml-1">건</span>
</p>
```

### 텍스트 위계
| 용도 | 클래스 |
|------|--------|
| 모달 제목 | `text-lg font-bold text-slate-800` |
| 섹션 제목 | `text-sm font-black text-slate-800` |
| 본문 | `text-sm text-slate-600` |
| 보조 설명 | `text-xs text-slate-400 leading-relaxed` |
| 영문 서브레이블 | `text-[10px] font-bold uppercase tracking-widest text-slate-400` |

---

## 4. 레이아웃 & 간격

### 섹션 간격
```tsx
<div className="space-y-6">  {/* 섹션 간 기본 간격 */}
```

### 카드 (대형)
```tsx
<div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
```

### 카드 (KPI / 소형 섹션)
```tsx
<div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
```

### 그리드
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
```

---

## 5. 버튼

### Primary (진한 배경)
```tsx
// 인디고 - 일반 주요 액션
<button className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md">
  확인
</button>

// 슬레이트 - 반품/주문 등 핵심 CTA
<button className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all">
  주문 확인
</button>
```

### Secondary (외곽선/연한 배경)
```tsx
<button className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-[0.98] transition-all">
  취소
</button>
```

### Danger (위험 액션)
```tsx
<button className="px-2 py-1 rounded-lg text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all active:scale-95">
  취소
</button>
```

### Warning (경고성 액션)
```tsx
<button className="px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-[0.98] transition-all shadow-sm">
  재고 최적화
</button>
```

### Disabled 상태
```tsx
// 비활성일 때 항상 아래 패턴 사용
className={`... ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
```

### 버튼 공통 규칙
- 폰트: `font-bold` 또는 `font-black` (절대 `font-medium` 이하 사용 금지)
- 클릭 피드백: `active:scale-[0.98]` 또는 `active:scale-95`
- 전환: `transition-all`
- 아이콘 포함 시: `flex items-center gap-1.5`
- 아이콘 크기: `w-3.5 h-3.5` (xs 버튼), `w-4 h-4` (sm 버튼)

---

## 6. 상태 배지 (Status Badge)

```tsx
// 완료
<span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">완료</span>

// 대기/미처리
<span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-50 border border-rose-100 text-rose-600">대기중</span>

// 진행 중
<span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-600">부분완료</span>

// 취소됨 / 비활성
<span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-400">취소됨</span>
```

---

## 7. 모달

### 오버레이 + 컨테이너
```tsx
<div
  className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
  onClick={onClose}  // 바깥 클릭으로 닫기
>
  <div
    className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
    onClick={(e) => e.stopPropagation()}
  >
```

### z-index 계층
| 레이어 | z-index |
|--------|---------|
| 헤더 | `z-[100]` |
| 스티키 바 | `z-20` |
| 모달 | `z-[200]` |
| 툴팁 | `z-50` |

### 모달 내부 구조
```tsx
{/* 헤더 */}
<div className="px-6 pt-6 pb-4 border-b border-slate-100">
  <h2 className="text-lg font-bold text-slate-800">제목</h2>
  <p className="text-xs text-slate-400 mt-0.5">서브 설명</p>
</div>

{/* 바디 */}
<div className="px-6 py-5 space-y-4">
  {/* 내용 */}
</div>

{/* 푸터 */}
<div className="px-6 pb-6 flex gap-3">
  <button className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-[0.98]">
    취소
  </button>
  <button className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-[0.98]">
    확인
  </button>
</div>
```

### ConfirmModal 색상 세트 패턴
```tsx
const COLORS = {
  indigo: { iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' },
  rose:   { iconBg: 'bg-rose-100',   iconText: 'text-rose-600',   btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' },
  amber:  { iconBg: 'bg-amber-100',  iconText: 'text-amber-600',  btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' },
  emerald:{ iconBg: 'bg-emerald-100',iconText: 'text-emerald-600',btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
};
```

### 모달 키보드 처리 (필수)
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

---

## 8. 폼 & 입력 요소

### 텍스트 입력
```tsx
<input
  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
/>
```

### Select
```tsx
<select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
```

### 레이블
```tsx
<label className="block text-xs font-bold text-slate-500 mb-1.5">레이블</label>
```

### Segment Control (탭형 버튼 그룹)
```tsx
<div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
  <button
    onClick={() => setActive('a')}
    className={`px-4 py-1 text-[11px] font-black rounded-lg transition-all ${
      active === 'a' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`}
  >
    옵션 A
  </button>
  <button
    onClick={() => setActive('b')}
    className={`px-4 py-1 text-[11px] font-black rounded-lg transition-all ${
      active === 'b' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`}
  >
    옵션 B
  </button>
</div>
```

---

## 9. 테이블

### 구조
```tsx
<div className="overflow-x-auto rounded-2xl border border-slate-100">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-100">
        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          컬럼명
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-50">
      <tr className="hover:bg-slate-50/80 transition-colors">
        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
          데이터
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Empty State (데이터 없음)
```tsx
<div className="flex flex-col items-center gap-2 py-24">
  <svg className="w-12 h-12 text-slate-200 drop-shadow-sm" .../>
  <p className="text-slate-400 font-bold text-sm mt-2">표시할 내역이 없습니다.</p>
</div>
```

---

## 10. 토스트 알림

### useToast 훅
```tsx
import { useToast } from '../hooks/useToast';

const { toast, showToast } = useToast(); // 기본 3500ms

showToast('저장되었습니다.', 'success');
showToast('오류가 발생했습니다.', 'error');
showToast('처리 중입니다.', 'info');
```

### Toast UI 렌더링 패턴
```tsx
{toast && (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-white animate-in slide-in-from-bottom-4 duration-300 ${
    toast.type === 'success' ? 'bg-emerald-600' :
    toast.type === 'error'   ? 'bg-rose-600'    : 'bg-slate-800'
  }`}>
    {toast.message}
  </div>
)}
```

---

## 11. 스티키 헤더 패턴

```tsx
<div
  className="sticky z-20 bg-slate-50/80 backdrop-blur-md pb-3 space-y-4"
  style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
>
```

- 배경: 반투명 + `backdrop-blur-md`
- 그림자: 인라인 스타일 (Tailwind 기본 shadow로는 표현 불가한 방향 제어)
- top: CSS 변수로 헤더 높이 참조

---

## 12. 펄스 / 긴급 표시

```tsx
// 긴급 상태 점 (애니메이션)
<span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />

// 강조 점 (정적)
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
```

---

## 13. 애니메이션

### 페이지/섹션 진입
```tsx
<div className="animate-in fade-in duration-500">
```

### 모달 진입
```tsx
// 오버레이
className="... animate-in fade-in duration-200"
// 컨테이너
className="... animate-in zoom-in-95 duration-200"
```

### 커스텀 CSS 클래스 (index.css에 정의)
| 클래스 | 효과 |
|--------|------|
| `.animate-fade-in-up` | 아래에서 위로 fade (0.8s) |
| `.animate-float` | 상하 부유 (4s loop) |
| `.animate-pulse-glow` | 인디고 글로우 pulse |
| `.animate-blob` | 불규칙 blob 움직임 |
| `.animate-bar-grow` | 차트 막대 grow (0.6s) |
| `.animate-line-appear` | 차트 라인 드로우 (1.5s) |
| `.animate-donut-draw` | 도넛 차트 그리기 (1s) |
| `.animate-icon-bounce` | 아이콘 단발 바운스 (0.6s) |
| `.animate-pulse-soft` | 부드러운 scale pulse |

---

## 14. 특수 유틸리티 클래스

```css
.chart-dot-grid     /* 배경 점 격자 (차트 영역) */
.custom-scrollbar   /* 커스텀 스크롤바 (테이블 등) */
.hide-scrollbar     /* 모바일 스크롤바 숨김 */
.patient-info-blur  /* 환자정보 blur → hover 해제 */
.glass              /* 흰 glassmorphism */
.glass-dark         /* 다크 glassmorphism */
.modal-safe         /* iOS safe-area padding */
.modal-scroll       /* overscroll-behavior: contain */
```

---

## 15. 툴팁

CLAUDE.md 규칙: HTML `title` 속성 **금지**, `group-hover` 커스텀 툴팁 **필수**
→ 자세한 패턴은 `.claude/commands/tooltip.md` 참조

---

## 16. 아이콘 규칙

- 라이브러리 없음 — 인라인 SVG만 사용
- 기본 크기: `w-4 h-4` (일반), `w-3.5 h-3.5` (버튼 내), `w-5 h-5` (헤더)
- 기본 속성: `fill="none" stroke="currentColor" viewBox="0 0 24 24"`
- strokeWidth: 중요 아이콘 `2.5`, 일반 `2`

---

## 17. 접근성

```tsx
// focus-visible (전역 index.css에 정의됨)
// input/select는 자동 적용, 커스텀 버튼은 아래 추가
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded-lg"

// 스크린리더 전용
aria-label="설명"

// 로딩 버튼
disabled={isSubmitting}
className={`... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
```

---

## 18. 모바일 대응

```tsx
// 기본: 모바일 우선 → md: 브레이크포인트로 데스크탑 확장
className="block md:flex"

// 모바일 전용 숨김
className="hidden md:block"

// 데스크탑 전용 숨김
className="block md:hidden"

// 터치 최적화 (index.css 전역 적용)
// touch-action: manipulation → 탭 딜레이 제거
// -webkit-tap-highlight-color: transparent → 탭 하이라이트 제거
```

---

## 19. 체크리스트 (새 컴포넌트 작성 시)

- [ ] 폰트 굵기 `font-bold` / `font-black` 사용 (버튼, 레이블)
- [ ] 버튼에 `active:scale-[0.98]` + `transition-all` 추가
- [ ] 모달에 Escape 키 닫기 + 바깥 클릭 닫기 구현
- [ ] 이중 레이블 (한국어 + 영문 서브) 적용
- [ ] 상태 배지 색상 4종 팔레트 준수
- [ ] 툴팁은 group-hover 방식으로 (title 속성 금지)
- [ ] 빈 상태(Empty State) 처리
- [ ] 로딩 중 버튼 disabled 처리
- [ ] z-index 계층 준수 (모달: 200, 헤더: 100, 스티키: 20, 툴팁: 50)
