# Gap Analysis: traffic-tracking (v2)

- **Date**: 2026-02-22
- **Match Rate**: 100%
- **Phase**: Check (완료)
- **검증 항목**: 42개 (v1의 31개 → 이벤트 계측/대기신청 퍼널 추가로 확장)

## 결과 요약

| 카테고리 | 항목 수 | 점수 | 상태 |
|----------|:-------:|:----:|:----:|
| DB 스키마 — 컬럼 | 8 | 100% | ✅ |
| DB 스키마 — 인덱스 | 4 | 100% | ✅ |
| DB 스키마 — RLS 정책 | 4 | 100% | ✅ |
| 서비스 레이어 — 메서드 | 5 | 100% | ✅ |
| 서비스 레이어 — 세부 구현 | 3 | 100% | ✅ |
| 트래킹 연동 | 7 | 100% | ✅ |
| 대시보드 트래픽 탭 | 11 | 100% | ✅ |
| **전체** | **42** | **100%** | **✅ PASS** |

---

## 섹션 2. DB 스키마

### 컬럼 (8/8)

| 컬럼 | 마이그레이션 | 구현 | 상태 |
|------|------------|------|:----:|
| id UUID PK | 048 | gen_random_uuid() PRIMARY KEY | ✅ |
| page TEXT NOT NULL | 048 | TEXT NOT NULL | ✅ |
| session_id TEXT | 048 | TEXT | ✅ |
| referrer TEXT | 048 | TEXT | ✅ |
| created_at TIMESTAMPTZ | 048 | DEFAULT NOW() | ✅ |
| user_id UUID FK | 049 (conversion) | REFERENCES auth.users(id) | ✅ |
| event_type TEXT | 050 (event_type) | TEXT + COMMENT | ✅ |
| event_data JSONB | 050 (event_type) | JSONB + COMMENT | ✅ |

### 인덱스 (4/4)

| 인덱스 | 파일 | 상태 |
|--------|------|:----:|
| idx_page_views_created_at (created_at DESC) | 048 | ✅ |
| idx_page_views_page (page) | 048 | ✅ |
| idx_page_views_user_id (user_id) | 049 | ✅ |
| idx_page_views_event_type (event_type) | 050 | ✅ |

### RLS 정책 (4/4)

| 정책 | 내용 | 상태 |
|------|------|:----:|
| page_views_insert | anon, authenticated INSERT WITH CHECK (true) | ✅ |
| page_views_select | authenticated SELECT USING (true) | ✅ |
| page_views_update_convert | USING (user_id IS NULL) / WITH CHECK (user_id = auth.uid()) | ✅ |
| page_views_delete_admin | authenticated DELETE USING (true) | ✅ |

---

## 섹션 3. 서비스 레이어 (pageViewService.ts)

### 메서드 (5/5)

| 메서드 | 설계 | 구현 위치 | 상태 |
|--------|------|-----------|:----:|
| track(page) | PUBLIC_PAGES 체크 후 INSERT, fire-and-forget | L24-31 | ✅ |
| markConverted(userId) | session_id 매치 + user_id IS NULL 행에 UPDATE | L37-46 | ✅ |
| trackEvent(event_type, event_data?) | page='pricing', event_type, event_data, session_id INSERT | L53-60 | ✅ |
| getRecent(days) | event_type, event_data 포함 SELECT | L69-78 | ✅ |
| deleteAll() | 전체 DELETE (테스트용) | L63-66 | ✅ |

### 세부 구현 (3/3)

| 항목 | 상태 |
|------|:----:|
| PUBLIC_PAGES 7개 (landing, pricing, analyze, contact, value, login, signup) | ✅ |
| getRecent() SELECT에 event_type, event_data 포함 | ✅ |
| trackEvent() page='pricing' 고정 삽입 | ✅ |

---

## 섹션 4. 트래킹 연동

| 항목 | 구현 위치 | 상태 |
|------|-----------|:----:|
| App.tsx useEffect — pageViewService.track(state.currentView) | App.tsx L366-368 | ✅ |
| useAppState handleLoginSuccess — markConverted(user.id) | useAppState.ts L151 | ✅ |
| PricingPage — pricing_waitlist_button_click (버튼 onClick) | PricingPage.tsx L810 | ✅ |
| PricingPage — pricing_waitlist_modal_open (useEffect on waitlistPlan) | PricingPage.tsx L334-338 | ✅ |
| PricingPage — pricing_waitlist_submit_start | PricingPage.tsx L343 | ✅ |
| PricingPage — pricing_waitlist_submit_success | PricingPage.tsx L354 | ✅ |
| PricingPage — pricing_waitlist_submit_error | PricingPage.tsx L360 | ✅ |

---

## 섹션 5. 대시보드 트래픽 탭

| 섹션 | 내용 | 상태 |
|------|------|:----:|
| PageViewRow 타입 | event_type, event_data 필드 포함 | ✅ |
| 5-1. 기간 선택기 | 4버튼 + 새로고침 + 리셋(confirm + deleteAll) | ✅ |
| 5-2. KPI 카드 4개 | 오늘/이번주/고유방문자/전환자+전환율% | ✅ |
| 5-3. 전환율 게이지 | gradient progress bar + 수치 | ✅ |
| 5-4. 일별 바 차트 | indigo(뷰) + purple(전환) overlay | ✅ |
| 5-5. 전환 퍼널 | landing→analyze→pricing→signup/login + 이탈률 색상코딩 | ✅ |
| 5-6. 페이지 이동 경로 Top 8 | session A→B 페어 빈도 | ✅ |
| 5-7. 진입/이탈 페이지 | 2열 그리드, 세션 첫/마지막 페이지 분포 | ✅ |
| 5-8. 페이지별 방문/전환 | indigo(뷰)+purple(전환) 바 + 전환율% | ✅ |
| 5-9. 품절 대기신청 퍼널 | 데이터 없을 때 숨김, 4단계, 플랜별 분리(2개↑), 이탈률 색상코딩 | ✅ |
| 5-10. 유입 경로 Referrer | hostname 파싱, 직접유입, Top 8 | ✅ |

---

## Gap 목록

**없음.** 42개 항목 전부 설계와 일치.

---

## v1 → v2 변경 내용

v1(31개)에서 누락되었던 항목 11개 추가 검증:
- event_type, event_data 컬럼 및 인덱스
- page_views_delete_admin RLS 정책
- trackEvent(), deleteAll() 메서드
- getRecent()의 event 컬럼 포함 여부
- PricingPage 5개 이벤트 계측
- 대시보드 5-9 대기신청 퍼널 섹션
- PageViewRow 타입 event 필드
