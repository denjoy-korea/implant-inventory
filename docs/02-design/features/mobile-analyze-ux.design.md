# Design: mobile-analyze-ux

> Plan 참조: `docs/01-plan/features/mobile-analyze-ux.plan.md`

---

## 1. 아키텍처 개요

### 변경 전 (AS-IS)
```
모바일에서 "분석 문의" 클릭
  → handleAnalyzeEntry()
    → matchMedia 감지 → isMobile = true
      → showAlertToast("무료분석은 PC에서 이용 가능합니다. 문의 페이지로 안내합니다.")
      → onNavigate('contact')  ← 사용자가 원하지 않던 페이지로 강제 이동
```

### 변경 후 (TO-BE)
```
모바일에서 "무료분석" 클릭
  → handleAnalyzeEntry()
    → onNavigate('analyze')  ← 차단 없이 직행

  → AnalyzePage 렌더
    → useMobileDetect() → isMobile = true
      → <MobileAnalyzeGate onSignup={...} onContact={...} />
        ← 이유 설명 + 3가지 CTA 표시
```

---

## 2. 컴포넌트 설계

### 2-1. `MobileAnalyzeGate.tsx` (신규)

**경로**: `components/analyze/MobileAnalyzeGate.tsx`

**Props**:
```typescript
interface MobileAnalyzeGateProps {
  onSignup: () => void;
  onContact: () => void;
}
```

**UI 구조**:
```
┌──────────────────────────────────────┐
│  [상단 아이콘 + 배지]                  │
│  📊  무료 재고 건강도 분석             │
│      PC 전용 기능                     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  💡 왜 PC에서만 가능한가요?   │    │
│  │                              │    │
│  │  덴트웹·청구프로그램에서 수술  │    │
│  │  기록 엑셀을 내려받아야 분석이 │    │
│  │  시작됩니다. 해당 프로그램은  │    │
│  │  현재 모바일을 지원하지 않아  │    │
│  │  파일 준비가 어렵습니다.      │    │
│  └──────────────────────────────┘    │
│                                      │
│  [무료로 먼저 시작하기 →]  ← primary  │
│  (분석 없이 재고 관리 바로 시작)       │
│                                      │
│  [PC에서 분석 링크 받기 ↗] ← secondary│
│  (이메일·카카오로 링크 공유)           │
│                                      │
│  [전문가에게 분석 맡기기]  ← tertiary  │
│  (상담 신청 시 분석 결과 제공)         │
└──────────────────────────────────────┘
```

**CTA 동작 상세**:

| CTA | 라벨 | 동작 | 스타일 |
|-----|------|------|--------|
| Primary | 무료로 먼저 시작하기 | `onSignup()` | `bg-slate-900 text-white` (메인 CTA와 동일) |
| Secondary | PC에서 분석 링크 받기 | `navigator.share()` 또는 `mailto:` fallback | `border border-indigo-200 text-indigo-700` |
| Tertiary | 전문가에게 분석 맡기기 | `onContact()` | `text-slate-500 underline` (텍스트 링크) |

**"PC에서 분석 링크 받기" 로직**:
```typescript
const shareUrl = 'https://inventory.denjoy.info/analyze';
const shareText = 'DenJOY 무료 재고 건강도 분석 — PC에서 확인하세요';

if (navigator.share) {
  // Web Share API (모바일 기본 공유 시트)
  navigator.share({ title: shareText, url: shareUrl });
} else {
  // fallback: mailto
  window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;
}
```

---

### 2-2. `AnalyzePage.tsx` (수정)

**모바일 감지 추가**:
```typescript
// 기존 import 아래에 추가
import MobileAnalyzeGate from './analyze/MobileAnalyzeGate';

const AnalyzePage: React.FC<AnalyzePageProps> = ({ onSignup, onContact }) => {
  // 모바일 감지 (SSR-safe)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
      const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      setIsMobile(isMobileSize || isTouchDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 모바일이면 게이트 표시 (step과 무관하게)
  if (isMobile) {
    return (
      <MobileAnalyzeGate
        onSignup={onSignup}
        onContact={() => onContact({ email: '' })}
      />
    );
  }

  // 이하 기존 로직 유지
  const analyze = useAnalyzePage({ onContact });
  // ...
};
```

> **주의**: `useAnalyzePage` hook 호출은 조건부 렌더 아래로 내려가면 Hooks 규칙 위반이 됨.
> `isMobile` 게이트는 hook 호출 이전에 return 해야 하므로, 실제 구현 시 hook을 항상 호출하고
> 그 아래에서 isMobile 분기 처리한다.

**수정된 실제 구조**:
```typescript
const AnalyzePage: React.FC<AnalyzePageProps> = ({ onSignup, onContact }) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { /* matchMedia 감지 */ }, []);

  const analyze = useAnalyzePage({ onContact }); // hook은 항상 호출
  const { step, report, progress, processingMsg } = analyze;

  if (isMobile) {
    return <MobileAnalyzeGate onSignup={onSignup} onContact={() => onContact({ email: '' })} />;
  }

  if (step === 'upload') { /* 기존 */ }
  if (step === 'processing') { /* 기존 */ }
  if (!report) return null;
  return <AnalyzeReportStep {...} />;
};
```

---

### 2-3. `PublicAppShell.tsx` (수정)

**`handleNavigate` 수정** (line 232-243):
```typescript
// 변경 전
const handleNavigate = (targetView: View) => {
  if (targetView === 'analyze') {
    const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isMobileSize || isTouchDevice) {
      showAlertToast('무료분석은 PC에서 이용 가능합니다. PC로 접속해 주세요.', 'info');
      return;
    }
  }
  onNavigate(targetView);
};

// 변경 후 — analyze 모바일 차단 블록 전체 제거
const handleNavigate = (targetView: View) => {
  onNavigate(targetView);
};
```

**`handleAnalyzeEntry` 수정** (line 245-254):
```typescript
// 변경 전
const handleAnalyzeEntry = () => {
  const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isMobileSize || isTouchDevice) {
    showAlertToast('무료분석은 PC에서 이용 가능합니다. 문의 페이지로 안내합니다.', 'info');
    onNavigate('contact');
    return;
  }
  onNavigate('analyze');
};

// 변경 후 — 항상 analyze로 이동
const handleAnalyzeEntry = () => {
  onNavigate('analyze');
};
```

---

### 2-4. `PublicMobileNav.tsx` (수정)

**라벨 변경**:
```tsx
// 변경 전
<span className="text-[12px] font-bold">분석 문의</span>

// 변경 후
<span className="text-[12px] font-bold">무료분석</span>
```

**버튼 스타일**: 기존 emerald 그린 계열 유지 (눈에 띄는 강조 유지)

---

## 3. 모바일 판별 기준

기존 `PublicAppShell.tsx`의 판별 로직과 동일하게 유지:

```typescript
const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const isMobile = isMobileSize || isTouchDevice;
```

- `max-width: 1023px`: 태블릿 가로(1024px) 미만 — 파일 작업이 어려운 화면
- `hover: none` + `pointer: coarse`: 터치 기기 — 정밀 파일 조작 불가

---

## 4. UI 스타일 가이드 적용

CLAUDE.md의 모달 헤더 컬러 코딩에서 `MobileAnalyzeGate`는 독립 페이지이므로:
- 배경: `bg-slate-50` (전체 페이지 배경)
- 안내 카드: `bg-white border border-amber-100` (주의/안내 → amber 계열)
- 아이콘 배지: `bg-indigo-100 text-indigo-600`
- Primary CTA: `bg-slate-900 text-white` (기존 CTA와 통일)

---

## 5. 파일 변경 요약

| 파일 | 변경 유형 | 변경 내용 |
|------|-----------|-----------|
| `components/analyze/MobileAnalyzeGate.tsx` | **신규** | 모바일 전용 안내 + 3 CTA |
| `components/AnalyzePage.tsx` | 수정 | useState+useEffect 추가, isMobile 분기 |
| `components/app/PublicAppShell.tsx` | 수정 | handleNavigate·handleAnalyzeEntry 모바일 차단 제거 |
| `components/PublicMobileNav.tsx` | 수정 | "분석 문의" → "무료분석" |

---

## 6. Acceptance Criteria (검증 기준)

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| AC1 | 모바일에서 하단 "무료분석" 탭 클릭 | MobileAnalyzeGate 화면 표시 |
| AC2 | PC에서 "무료 분석" 클릭 | 기존 파일 업로드 스텝 표시 |
| AC3 | MobileAnalyzeGate → "무료로 먼저 시작하기" | 회원가입 페이지 이동 |
| AC4 | MobileAnalyzeGate → "PC에서 분석 링크 받기" | Web Share API 또는 mailto 동작 |
| AC5 | MobileAnalyzeGate → "전문가에게 분석 맡기기" | 문의 페이지 이동 |
| AC6 | 모바일에서 분석 진입 시 toast 미표시 | toast 없이 페이지 전환 |
| AC7 | 태블릿(1024px+, 마우스) 에서 분석 | 기존 업로드 스텝 표시 |
