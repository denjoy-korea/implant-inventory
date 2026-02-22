# Feature Plan: waitlist-admin

## 개요
시스템 관리자 대시보드에 **대기자 관리** 탭을 추가한다.
`contact_inquiries` 테이블의 `inquiry_type = 'plan_waitlist_*'` 행을 전용 탭에서 조회하고,
플랜별 필터·상태 변경·카운트 배지로 대기자를 효율적으로 관리한다.

## 배경 및 목적
- **현재 상태**: 대기 신청이 들어오면 Slack 알림만 가고, 관리자 대시보드에서는 일반 `inquiries` 탭에 섞여 보임
- **문제점**:
  - 대기자만 따로 볼 방법이 없어 플랜별 대기자 수 파악 어려움
  - 상태 변경(연락 완료, 가입 완료) 후 추적이 불편
  - 일반 문의와 대기 신청이 혼재하여 운영 효율 저하
- **목표**: 대기자 신청을 전용 탭에서 플랜별로 분류·추적하여 전환율 향상

## 사용자 스토리
- 운영자로서 플랜별 대기자 수를 한눈에 파악하고 싶다
- 운영자로서 대기자 상태를 `pending → in_progress → resolved`로 변경하여 진행을 추적하고 싶다
- 운영자로서 특정 플랜의 대기자만 필터링하여 집중 관리하고 싶다

## 기능 요구사항

### FR-01: AdminTab 확장
`SystemAdminDashboard.tsx` AdminTab 타입에 `'waitlist'` 추가

### FR-02: 사이드바 메뉴 항목
- 아이콘: 클락/큐 관련 SVG
- 레이블: "대기자 관리"
- 대기 중(`pending`) 건수 배지 표시 (실시간 카운트)
- 기존 `inquiries` 항목 아래에 배치

### FR-03: 대기자 목록 뷰
| 컬럼 | 내용 |
|------|------|
| 접수일시 | created_at (KST) |
| 플랜 | inquiry_type → Basic/Plus/Business/Ultimate 레이블 |
| 이름 | contact_name |
| 이메일 | email |
| 상태 | 배지: pending(노란)/in_progress(파란)/resolved(초록) |
| 액션 | 상태 변경 드롭다운 |

**필터**: 전체 / Basic / Plus / Business / Ultimate
**정렬**: 접수일시 내림차순 (최신 순)

### FR-04: 상태 변경
- 기존 `contactService.updateStatus(id, status)` 재사용
- 행 우측 드롭다운으로 상태 변경 → 즉시 목록 반영
- 상태 레이블: pending="대기 중", in_progress="연락 완료", resolved="가입 완료"

### FR-05: 플랜별 요약 카드 (헤더)
대기자 탭 상단에 플랜별 카드 4개:
```
┌──────────┬──────────┬──────────┬──────────┐
│  Basic   │   Plus   │ Business │ Ultimate │
│  대기 3  │  대기 7  │  대기 1  │  대기 0  │
└──────────┴──────────┴──────────┴──────────┘
```
각 카드 클릭 시 해당 플랜 필터 적용

### FR-06: 서비스 함수
`contactService`에 대기자 전용 조회 함수 추가:
```typescript
getWaitlist(filter?: { plan?: string }): Promise<ContactInquiry[]>
// inquiry_type LIKE 'plan_waitlist_%' 필터 + plan 추가 필터
```

## 비기능 요구사항
- 기존 `inquiries` 탭 수정 없음 (일반 문의는 현행 유지)
- `contactService.getAll()` 재활용 금지 → 전용 함수로 분리
- 상태 변경 실패 시 토스트 에러 표시

## 범위 제외 (Out of Scope)
- 이메일 발송 기능 — Phase 2
- Slack으로 상태 변경 알림 — Phase 2
- 대기자 메모/노트 기능 — Phase 2

## 수용 기준
1. `npm run build` 통과
2. 사이드바에 "대기자 관리" 메뉴 + pending 카운트 배지 표시
3. 대기자 목록이 `plan_waitlist_*`만 조회
4. 플랜 필터 동작 (전체/Basic/Plus/Business/Ultimate)
5. 상태 변경 후 목록 즉시 갱신

## 관련 파일
- `components/SystemAdminDashboard.tsx` — 주요 수정 (AdminTab, 사이드바, 탭 콘텐츠)
- `services/contactService.ts` — `getWaitlist()` 함수 추가
