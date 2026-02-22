# Traffic Tracking Design

**Feature**: traffic-tracking
**Date**: 2026-02-22
**Phase**: Do (구현 완료)

---

## 1. 개요

홈페이지 공개 페이지 방문자를 익명으로 추적하고,
로그인 전환 여부 및 품절 대기신청 퍼널을 연결하여
운영자가 트래픽·전환율을 분석할 수 있게 한다.

---

## 2. DB 스키마

### 2-1. `page_views` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | gen_random_uuid() |
| page | TEXT NOT NULL | 페이지 이름 (landing, pricing, ...) |
| session_id | TEXT | sessionStorage 익명 세션 ID |
| user_id | UUID FK auth.users | 로그인 시 연결 (049 migration) |
| referrer | TEXT | document.referrer |
| event_type | TEXT | NULL=페이지뷰, pricing_waitlist_* 이벤트 (050 migration) |
| event_data | JSONB | {"plan":"plus"} 등 구조화 데이터 (050 migration) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**인덱스**: created_at DESC, page, user_id, event_type

### 2-2. RLS 정책

| 정책 | 대상 | 내용 |
|------|------|------|
| page_views_insert | anon, authenticated | INSERT 허용 |
| page_views_select | authenticated | SELECT 허용 |
| page_views_update_convert | authenticated | user_id IS NULL 행에 auth.uid() 설정 허용 |
| page_views_delete_admin | authenticated | DELETE 허용 (테스트용 리셋) |

---

## 3. 서비스 레이어

### `services/pageViewService.ts`

| 메서드 | 설명 |
|--------|------|
| `track(page)` | 공개 페이지 뷰 기록 (fire-and-forget) |
| `markConverted(userId)` | 로그인 성공 시 세션의 page_views에 user_id 기록 |
| `trackEvent(event_type, event_data?)` | UI 이벤트 기록 (버튼 클릭, 모달, 제출 등) |
| `getRecent(days)` | 관리자용 최근 N일 데이터 조회 (event_type, event_data 포함) |
| `deleteAll()` | 전체 데이터 삭제 (테스트용) |

**PUBLIC_PAGES**: `landing, pricing, analyze, contact, value, login, signup`

---

## 4. 트래킹 연동

### 4-1. 페이지 이동 추적

`App.tsx`에서 `state.currentView` 변경 시 `pageViewService.track()` 호출

### 4-2. 로그인 전환 연동

`hooks/useAppState.ts`의 `handleLoginSuccess`에서 `markConverted` 호출

### 4-3. 품절 대기신청 이벤트 (PricingPage.tsx)

| 이벤트 | 발생 시점 | event_data |
|--------|-----------|------------|
| `pricing_waitlist_button_click` | "대기 신청하기" 버튼 클릭 | `{ plan: 'plus' }` |
| `pricing_waitlist_modal_open` | waitlistPlan state 세팅 후 useEffect | `{ plan: 'plus' }` |
| `pricing_waitlist_submit_start` | handleWaitlistSubmit 시작 | `{ plan: 'plus' }` |
| `pricing_waitlist_submit_success` | contactService.submit() 성공 후 | `{ plan: 'plus' }` |
| `pricing_waitlist_submit_error` | contactService.submit() 실패 시 | `{ plan: 'plus' }` |

---

## 5. 관리자 대시보드 (SystemAdminDashboard - 방문자 트래픽 탭)

### 5-1. 기간 선택기

- 7 / 14 / 30 / 90일 버튼 + 새로고침 + 리셋(DB 삭제)

### 5-2. KPI 카드 (4개)

| 카드 | 설명 |
|------|------|
| 오늘 페이지뷰 | today 날짜 필터 |
| 이번 주 페이지뷰 | 최근 7일 |
| 고유 방문자 | unique session_id 수 |
| 로그인 전환자 | user_id 있는 unique session 수 + 전환율 % |

### 5-3. 전환율 게이지

전체 세션 대비 로그인 전환 세션 비율 (progress bar)

### 5-4. 일별 바 차트

인디고(페이지뷰) + 보라(전환) 겹쳐서 표시

### 5-5. 전환 퍼널 (방문 퍼널)

단계: `landing → analyze → pricing → signup/login`
각 단계 세션 수 + 이전 단계 대비 이탈률 (색상 코딩)

### 5-6. 페이지 이동 경로 Top 8

세션 내 연속 페이지 이동 페어 빈도

### 5-7. 진입 / 이탈 페이지

세션 첫/마지막 페이지 분포

### 5-8. 페이지별 방문 / 전환

페이지별 방문수 + 전환율 (%)

### 5-9. 품절 대기신청 전환 퍼널

- 이벤트 데이터 없을 때 섹션 숨김
- 4단계 퍼널: 버튼 클릭 → 모달 오픈 → 제출 시작 → 제출 성공
- 단계별 이탈률 (색상 코딩)
- 플랜이 2개 이상일 때 플랜별 분리 표시 (클릭 대비 최종 전환율)

### 5-10. 유입 경로 (Referrer)

document.referrer 도메인 집계 (직접 유입 포함) Top 8

---

## 6. 데이터 흐름

```
브라우저 → pageViewService.track()      → page_views (page, session_id)
로그인    → pageViewService.markConverted() → UPDATE page_views SET user_id
UI이벤트  → pageViewService.trackEvent()  → page_views (event_type, event_data)
관리자    → pageViewService.getRecent()   → trafficData state
trafficData → 클라이언트 집계 → 차트/퍼널 렌더링
리셋버튼  → pageViewService.deleteAll()   → DELETE page_views (테스트용)
```
