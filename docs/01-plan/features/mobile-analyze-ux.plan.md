# Plan: mobile-analyze-ux

## Overview
모바일에서 무료분석 접근 시 UX 개선 — 기능 제한은 유지하되, 기대관리·가치 전달 방식을 다듬는다.

**핵심 문제**: 무료 분석은 핵심 훅(hook)인데, 모바일에서 클릭하면 토스트 메시지 하나 후 문의 페이지로 전환됨. 사용자 입장에서 "왜 막히는지", "다음 행동이 무엇인지"가 불명확하다.

**제약 전제**: 덴트웹/청구프로그램이 모바일을 지원하지 않아 엑셀 다운로드→업로드 플로우 자체가 모바일에서 성립하지 않음. 분석 기능 차단은 타당한 운영 제약.

---

## Goals
1. 모바일 사용자에게 무료분석 페이지를 보여주되, 파일 업로드 UI 대신 **모바일 전용 안내 화면**을 표시한다
2. "왜 PC여야 하는지" 이유를 명확히 설명하고, **다음 행동 3가지**를 제시한다
3. 하단 네비게이션 "분석 문의" 라벨을 **기대를 정확히 반영하는 표현**으로 변경한다
4. LandingPage 모바일 Hero CTA는 분석보다 **무료 회원가입**을 primary로 유도한다

---

## User Stories

| # | As a | I want to | So that |
|---|------|-----------|---------|
| U1 | 모바일 방문자 | 무료분석 버튼 클릭 시 제대로 된 안내를 받고 싶다 | 왜 막히는지 이해하고 대안을 선택할 수 있다 |
| U2 | 모바일 방문자 | PC에서 분석할 수 있도록 링크를 이메일로 받고 싶다 | 나중에 PC에서 이어서 진행할 수 있다 |
| U3 | 모바일 방문자 | 분석 없이도 무료로 가입할 수 있음을 알고 싶다 | 바로 시작할 수 있다 |
| U4 | 모바일 방문자 | 분석을 상담으로 대신 진행할 수 있음을 알고 싶다 | 분석 결과를 다른 방법으로 얻을 수 있다 |

---

## Scope

### In Scope (이번 PDCA)
- `AnalyzePage.tsx`: 모바일 감지 시 업로드 스텝 대신 **MobileAnalyzeGate 컴포넌트** 표시
- `MobileAnalyzeGate` 신규 컴포넌트: PC 전용 이유 + 3가지 CTA (회원가입 / 이메일 링크 받기 / 분석 상담 문의)
- `PublicMobileNav.tsx`: "분석 문의" → "무료분석↗" 또는 "PC분석" 등 기대 반영 텍스트로 변경
- `PublicAppShell.tsx`: `handleAnalyzeEntry`에서 toast+contact 우회 제거 → analyze 페이지로 직접 이동
- `PublicAppShell.tsx`: `handleNavigate('analyze')` 모바일 차단 toast 제거 → analyze 페이지 허용
- 이메일 링크 발송: Supabase Edge Function 없이 `mailto:` 링크로 단순 처리 (MVP)

### Out of Scope (이번 PDCA 제외)
- PC 전용 이유가 사라지는 경우(청구프로그램 모바일 지원) — 별도 PDCA
- 모바일 전용 분석 플로우 개발 (카메라로 스캔 등) — 중장기 로드맵
- LandingPage Hero CTA 전면 개편 — 별도 마케팅 PDCA

---

## Implementation Plan

### Phase 1 — AnalyzePage 모바일 게이트 (핵심)
**파일**: `components/analyze/MobileAnalyzeGate.tsx` (신규)

화면 구성:
```
┌─────────────────────────────────┐
│  📊 무료 재고 건강도 분석         │
│                                 │
│  ⚠️ 이 기능은 PC에서 이용 가능합니다 │
│                                 │
│  왜 PC여야 하나요?                │
│  덴트웹 수술기록은 PC에서만        │
│  다운로드할 수 있어, 파일 업로드가  │
│  모바일에서 작동하지 않습니다.     │
│                                 │
│  [무료로 먼저 가입하기]  ← primary │
│  [PC에서 분석 링크 받기] ← secondary│
│  [분석 상담 문의하기]   ← tertiary │
└─────────────────────────────────┘
```

### Phase 2 — 라우팅 차단 제거
**파일**: `components/app/PublicAppShell.tsx`
- `handleNavigate`: analyze 모바일 차단 toast 제거, analyze 페이지로 직행
- `handleAnalyzeEntry`: contact 우회 제거, analyze 페이지로 직행
- 모바일 차단 로직은 AnalyzePage 내부(MobileAnalyzeGate)가 담당

### Phase 3 — 하단 네비게이션 레이블 수정
**파일**: `components/PublicMobileNav.tsx`
- "분석 문의" → "무료분석" (PC 전용임은 클릭 후 안내)
- 또는 더 직관적인 표현 검토: "재고분석" / "분석하기"

---

## Acceptance Criteria

| # | 기준 | 판정 방법 |
|---|------|-----------|
| AC1 | 모바일에서 무료분석 클릭 시 MobileAnalyzeGate 화면이 표시된다 | 실기기 확인 |
| AC2 | PC에서 무료분석은 기존과 동일하게 업로드 스텝이 표시된다 | 실기기 확인 |
| AC3 | MobileAnalyzeGate의 "무료로 가입하기" 버튼이 회원가입으로 이동한다 | 클릭 확인 |
| AC4 | MobileAnalyzeGate의 "PC에서 분석 링크 받기"가 mailto: 링크를 동작시킨다 | 클릭 확인 |
| AC5 | MobileAnalyzeGate의 "분석 상담 문의"가 문의 페이지로 이동한다 | 클릭 확인 |
| AC6 | 모바일 하단 네비의 분석 버튼 라벨이 올바른 기대를 전달한다 | 실기기 확인 |
| AC7 | 모바일에서 분석 클릭 시 기존 toast 메시지가 더 이상 표시되지 않는다 | 실기기 확인 |

---

## File Impact

| 파일 | 변경 유형 | 비고 |
|------|-----------|------|
| `components/analyze/MobileAnalyzeGate.tsx` | 신규 | 모바일 전용 안내 컴포넌트 |
| `components/AnalyzePage.tsx` | 수정 | 모바일 감지 → MobileAnalyzeGate 렌더 |
| `components/app/PublicAppShell.tsx` | 수정 | 모바일 차단 로직 제거 |
| `components/PublicMobileNav.tsx` | 수정 | 라벨 텍스트 변경 |

---

## Risk & Notes
- **리스크 낮음**: 분석 기능 자체를 건드리지 않음. 라우팅 + UI 레이어만 변경.
- **모바일 판별**: `window.matchMedia('(hover: none) and (pointer: coarse)')` 또는 `(max-width: 1023px)` 기존 로직 재사용
- **이메일 링크**: `mailto:?subject=DenJOY 무료분석&body=PC에서 접속: https://inventory.denjoy.info/analyze` 형태로 단순 처리
