# 이벤트 스키마 동결 (Event Schema Freeze)

> **Status**: Frozen — 2026-03-05 (refactor-safe sync)
> **담당**: Growth Lead / Data Analyst
> **목적**: 퍼널 집계 정합성 확보. 이 문서의 이벤트 목록·필드 구조를 변경하려면 반드시 리뷰 후 버전 업데이트 필요.

---

## 1. DB 테이블 구조

**테이블명**: `page_views`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | PK |
| `page` | text | 공개 페이지 이름 (landing, pricing, analyze, contact, value, login, signup) |
| `event_type` | text | 이벤트 식별자 (아래 목록 참조) |
| `event_data` | jsonb | 이벤트별 추가 페이로드 + 공통 컨텍스트 |
| `session_id` | text | 브라우저 탭 단위 고유 ID (sessionStorage `denjoy_sid`) |
| `user_id` | uuid | 로그인 후 `markConverted()` 호출 시 업데이트 |
| `referrer` | text | `document.referrer` |
| `created_at` | timestamptz | 기록 시각 |

**session_id 생성 규칙**:
- `sessionStorage.getItem('denjoy_sid')` 존재하면 재사용
- 없으면 `Math.random().toString(36).slice(2) + Date.now().toString(36)` 생성
- 브라우저 탭 단위 (탭 닫으면 소멸)

**event_data 공통 필드** (모든 이벤트에 자동 포함):

| 필드 | 타입 | 설명 |
|------|------|------|
| `is_mobile` | boolean | viewport ≤ 1279px 이면 true |
| `viewport_width` | number | 픽셀 단위 뷰포트 너비 |

---

## 2. 퍼널 단계 정의 (동결)

7단계 퍼널. 각 단계는 **세션 단위 중복 제거** 후 집계.

| 순서 | event_type | 한국어 레이블 | 트리거 시점 |
|------|-----------|--------------|------------|
| 1 | `landing_view` | 랜딩 방문 | LandingPage 마운트 시 `pageViewService.track('landing')` |
| 2 | `pricing_view` | 요금제 방문 | PricingPage 마운트 시 `pageViewService.track('pricing')` |
| 3 | `auth_start` | 인증 시작 | 회원가입/로그인 폼 열림 |
| 4 | `auth_complete` | 인증 완료 | Supabase 인증 성공 후 |
| 5 | `analyze_start` | 분석 시작 | 파일 업로드 후 분석 요청 |
| 6 | `analyze_complete` | 분석 완료 | 분석 결과 수신 완료 |
| 7 | `contact_submit` \| `waitlist_submit` | 전환 | 문의 제출 또는 웨이팅 신청 완료 |

**fallback 규칙** (집계 시 적용):
- `landing_view` 없을 때 → `page = 'landing'` 행 수로 대체
- `pricing_view` 없을 때 → `page = 'pricing'` 행 수로 대체

---

## 3. 전체 이벤트 목록 (동결)

### 3.1 페이지 뷰 이벤트 (자동 생성)

`pageViewService.track(page)` 호출 시 `${page}_view` 형태로 자동 생성.

| event_type | page | 발생 위치 |
|-----------|------|---------|
| `landing_view` | landing | `hooks/useAppLogic.tsx` (`pageViewService.track`) |
| `pricing_view` | pricing | `hooks/useAppLogic.tsx` (`pageViewService.track`) |
| `analyze_view` | analyze | `hooks/useAppLogic.tsx` (`pageViewService.track`) |
| `contact_view` | contact | `hooks/useAppLogic.tsx` (`pageViewService.track`) |
| `value_view` | value | `hooks/useAppLogic.tsx` (`pageViewService.track`) |
| `login_view` | login | `hooks/useAppLogic.tsx` (`pageViewService.track`) |
| `signup_view` | signup | `hooks/useAppLogic.tsx` (`pageViewService.track`) |

### 3.2 인증 이벤트

| event_type | 설명 | event_data 추가 필드 | 발생 파일 |
|-----------|------|-------------------|---------|
| `auth_start` | 회원가입/로그인 시도 시작 | - | `hooks/useAuthForm.ts` |
| `auth_email_sent` | 매직링크/OTP 이메일 발송 | - | `hooks/useAuthForm.ts` |
| `auth_complete` | 인증 성공 | - | `hooks/useAuthForm.ts` |
| `auth_mfa_required` | MFA 인증 필요 | - | `hooks/useAuthForm.ts` |
| `auth_error` | 인증 오류 | - | `hooks/useAuthForm.ts` |

### 3.3 분석 이벤트

| event_type | 설명 | event_data 추가 필드 | 발생 파일 |
|-----------|------|-------------------|---------|
| `analyze_start` | 파일 업로드 후 분석 시작 | - | `hooks/useAnalyzePage.ts` |
| `analyze_complete` | 분석 완료 | - | `hooks/useAnalyzePage.ts` |
| `analyze_error` | 분석 오류 | - | `hooks/useAnalyzePage.ts` |
| `analyze_lead_submit_start` | 리드 정보 제출 시작 | - | `hooks/useAnalyzePage.ts` |
| `analyze_lead_submit` | 리드 정보 제출 완료 | - | `hooks/useAnalyzePage.ts` |

### 3.4 요금제/결제 이벤트

| event_type | 설명 | event_data 추가 필드 | 발생 파일 |
|-----------|------|-------------------|---------|
| `pricing_waitlist_button_click` | 웨이팅 버튼 클릭 | - | PricingPage.tsx |
| `pricing_waitlist_modal_open` | 웨이팅 모달 열림 | - | PricingPage.tsx |
| `pricing_waitlist_submit_start` | 웨이팅 제출 시작 | - | PricingPage.tsx |
| `pricing_waitlist_submit_success` | 웨이팅 제출 성공 | - | PricingPage.tsx |
| `pricing_waitlist_submit_error` | 웨이팅 제출 오류 | - | PricingPage.tsx |
| `pricing_payment_modal_open` | 결제 모달 열림 | - | PricingPage.tsx |
| `pricing_payment_request_success` | 결제 요청 성공 | - | PricingPage.tsx |
| `pricing_payment_request_error` | 결제 요청 오류 | - | PricingPage.tsx |

### 3.5 문의/웨이팅 이벤트

| event_type | 설명 | 발생 파일 |
|-----------|------|---------|
| `waitlist_submit_start` | 웨이팅 제출 시작 | - |
| `waitlist_submit` | 웨이팅 제출 완료 | - |
| `waitlist_submit_error` | 웨이팅 제출 오류 | - |
| `contact_submit_start` | 문의 제출 시작 | - |
| `contact_submit` | 문의 제출 완료 | - |
| `contact_submit_error` | 문의 제출 오류 | - |

### 3.6 PWA 업데이트 이벤트 (퍼널 외)

| event_type | 설명 |
|-----------|------|
| `pwa_update_detected` | 새 버전 감지 |
| `pwa_update_prompt_shown` | 업데이트 안내 표시 |
| `pwa_update_accept` | 사용자 업데이트 수락 |
| `pwa_update_defer` | 사용자 업데이트 연기 |
| `pwa_update_force_applied` | 강제 업데이트 적용 |

---

## 4. 집계 기준 (동결)

### 4.1 유효 세션 기준
- `session_id IS NOT NULL` 인 행만 집계
- 누락률 목표: **1% 미만**

### 4.2 단계별 전환율(CVR) 계산 — v2 (eligible sessions 기반)

eligible(stage[0]) = 전체 고유 세션 집합
eligible(stage[N]) = stage[N-1] 이벤트를 발생시킨 세션 집합

```
step_cvr(stage[N]) = |stage[N].sessions ∩ eligible(stage[N])|
                     ──────────────────────────────────────────  × 100
                              |eligible(stage[N])|
```

변경 이유: 직접 URL 진입 등 이전 단계를 거치지 않은 세션이 존재할 경우
단순 비율(stage_n+1 / stage_n) 산식은 CVR > 100%를 발생시킴.
eligible intersection 방식으로 항상 0~100% 보장.
적용일: 2026-03-05, 파일: `funnel-kpi-utils.mjs` + `SystemAdminTrafficTab.tsx`

### 4.3 모바일 이탈률
```
모바일_이탈률 = MAX(0, 100 - (모바일_engaged_sessions / 모바일_landing_sessions × 100))
engaged = pricing_view OR auth_start OR contact_submit OR waitlist_submit OR analyze_start
```

### 4.4 Time-to-Auth / Time-to-Value
- `landing_view → auth_complete` 시간 차이 (분)
- `auth_complete → analyze_complete` 시간 차이 (분)
- 같은 session_id의 created_at 차이로 계산

---

## 5. 품질 점검 기준 (주간)

| 항목 | 기준 | 조치 |
|------|------|------|
| session_id 누락률 | < 1% | 초과 시 pageViewService 코드 점검 |
| 퍼널 단계별 CVR 일관성 | 전 단계 ≥ 다음 단계 세션 수 | 역전 시 이벤트 중복/누락 점검 |
| 이벤트 이상치 | 단일 session 이벤트 > 1000건 | 봇 필터링 검토 |
| 일별 스냅샷 생성 | 28일 중 27일 이상 | 누락 시 수동 보완 |

---

## 6. 변경 관리

| 버전 | 날짜 | 변경 내용 | 승인자 |
|------|------|---------|------|
| v1.1 | 2026-03-05 | Auth/Analyze 추적 로직 리팩터링 경로(`hooks/useAuthForm.ts`, `hooks/useAnalyzePage.ts`) 반영, 페이지뷰 발생 경로를 `hooks/useAppLogic.tsx` 기준으로 정합화 | Growth Lead |
| v1.0 | 2026-03-04 | 초기 동결 | Growth Lead |

> **변경 규칙**: 이벤트 추가/삭제/필드 변경 시 이 문서 업데이트 필수. 집계 로직 변경 시 `funnel-kpi-regression.test.mjs` 동시 업데이트.
