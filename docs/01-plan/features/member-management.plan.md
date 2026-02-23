# Plan: 회원 정보 관리 (member-management)

## 메타
- **Feature**: member-management
- **작성일**: 2026-02-23
- **우선순위**: Medium
- **레벨**: Dynamic
- **상태**: Plan

---

## 1. 배경 및 목적

DenJOY/DentWeb SaaS는 **병원(hospital) 단위로 데이터를 격리**하는 구조를 가진다.
회원(User)은 세 가지 역할 계층으로 구분된다:

| 역할 | 설명 |
|------|------|
| `admin` | 시스템 운영자 (전체 접근) |
| `master` | 병원 원장 (병원 데이터 최고 권한) |
| `dental_staff` / `staff` | 병원 스태프 (제한된 권한) |

현재 회원 정보 관리 관련 기능은 여러 컴포넌트에 분산되어 있으며,
**기능 간 일관성 확보와 미구현 항목 보완**이 필요하다.

---

## 2. 범위

### 2-1. 내 프로필 수정 (MyProfile)
- **현황**: `UserProfile.tsx` → 내 정보 탭에 이름/연락처 수정, 보안 탭에 비밀번호/MFA 관리 구현됨
- **개선 필요**:
  - 프로필 이미지 업로드 지원 여부 검토
  - 이메일 변경 기능 (현재 불가 — 정책 결정 필요)
  - 비밀번호 변경 이력 표시 (현재 "30일 전" 하드코딩)
  - 마지막 로그인 정보 실제 데이터 연동 (현재 더미 데이터)

### 2-2. 병원 스태프 관리 (HospitalStaffManagement)
- **현황**: `MemberManager.tsx`에 초대/권한 관리 구현됨
- **개선 필요**:
  - 초대 링크 만료 처리 UI 확인
  - 스태프 계정 비활성화 기능 여부 확인 (강제 탈퇴 vs 비활성화)
  - 역할 변경 로그 기록 여부 확인

### 2-3. 시스템 관리자 회원 관리 (SystemAdminUserManagement)
- **현황**: `SystemAdminUsersTab.tsx`에 목록 조회/삭제 구현됨
- **개선 필요**:
  - 회원 검색/필터링 기능 (현재 없음)
  - 회원 상태 변경 (비활성화/재활성화)
  - 회원 상세 정보 편집 기능 (현재 조회만 가능)
  - 이메일 재발송 기능 (가입 확인 이메일)

### 2-4. 회원 탈퇴 처리 (AccountDeletion)
- **현황**: `UserProfile.tsx` 보안 탭 → 탈퇴 사유 수집 + DB 삭제 구현됨
- **개선 필요**:
  - 탈퇴 처리 중 병원 데이터 처리 정책 명확화
    - `master` 탈퇴 시: 병원 데이터 어떻게 처리?
    - `dental_staff` 탈퇴 시: 병원에서 자동 제거?
  - 탈퇴 후 데이터 보존 기간 정책 (GDPR/개인정보보호법)
  - 관리자에 의한 강제 탈퇴 처리 UI

### 2-5. DB-앱 연동 구조 문서화
- **목적**: 회원 정보가 DB와 앱에서 어떻게 관리되는지 이해
- **주요 테이블**:
  - `auth.users` (Supabase Auth) — 이메일, 암호화된 비밀번호
  - `public.profiles` — 이름, 연락처, 역할, hospital_id
  - `public.hospitals` — 병원 정보, 플랜
  - `public.hospital_members` — 병원-스태프 매핑
  - `public.withdrawal_reasons` — 탈퇴 사유 기록
- **서비스 레이어**:
  - `authService.ts` — 인증, 프로필 수정, 탈퇴
  - `hospitalService.ts` — 스태프 초대, 역할 관리

---

## 3. 사용자 스토리

| ID | 역할 | 스토리 | 우선순위 |
|----|------|--------|---------|
| US-01 | 모든 회원 | 이름과 연락처를 수정할 수 있다 | Must |
| US-02 | 모든 회원 | 비밀번호를 변경할 수 있다 | Must |
| US-03 | 모든 회원 | 2단계 인증(MFA)을 설정/해제할 수 있다 | Should |
| US-04 | 모든 회원 | 회원 탈퇴를 직접 처리할 수 있다 | Must |
| US-05 | master | 병원 스태프를 초대할 수 있다 | Must |
| US-06 | master | 스태프 권한을 변경할 수 있다 | Must |
| US-07 | master | 스태프를 강제 제거할 수 있다 | Must |
| US-08 | admin | 전체 회원 목록을 검색/필터로 조회할 수 있다 | Should |
| US-09 | admin | 회원 계정을 비활성화/재활성화할 수 있다 | Could |
| US-10 | admin | 회원 계정을 강제 삭제할 수 있다 | Must |

---

## 4. 현재 구현 갭 분석 (예비)

| 항목 | 현황 | 갭 |
|------|------|-----|
| 내 정보 수정 | 구현됨 | 로그인 이력 더미 데이터, 비밀번호 변경일 하드코딩 |
| 스태프 초대 | 구현됨 | 초대 만료 UI 검증 필요 |
| 관리자 회원 검색 | 미구현 | 검색/필터 기능 추가 필요 |
| 계정 비활성화 | 미구현 | 삭제 외 비활성화 상태 관리 없음 |
| master 탈퇴 정책 | 미정 | 병원 데이터 처리 정책 결정 필요 |
| 탈퇴 후 데이터 보존 | 미정 | 개인정보 보호 정책 정의 필요 |

---

## 5. 구현 우선순위

### Phase 1 — 즉시 개선 (현재 스프린트)
1. **관리자 회원 검색/필터** — `SystemAdminUsersTab.tsx` 개선
2. **로그인 이력 실제 데이터 연동** — `UserProfile.tsx` 보안 탭
3. **비밀번호 변경일 실제 데이터** — `UserProfile.tsx` 보안 탭

### Phase 2 — 정책 결정 후 구현
1. `master` 탈퇴 시 병원 데이터 처리 플로우
2. 계정 비활성화 기능 (삭제 대신 soft-delete)
3. 관리자에 의한 강제 탈퇴/비활성화 UI

### Phase 3 — 선택적 개선
1. 프로필 이미지 업로드
2. 이메일 변경 기능
3. 이메일 재발송 기능

---

## 6. 기술적 고려사항

### DB 구조
```
auth.users (Supabase 관리)
    └── public.profiles (hospital_id, role, name, phone)
            └── public.hospital_members (병원-스태프 매핑)
                        └── public.hospitals (plan, trial 정보)
```

### 탈퇴 처리 흐름
```
사용자 탈퇴 요청
    → withdrawal_reasons INSERT (탈퇴 사유 저장)
    → notify-withdrawal Edge Function (Slack 알림)
    → auth.users DELETE (cascade → profiles 삭제)
    → hospital_members 자동 제거 (FK cascade)
```

### 주요 RLS 정책
- `profiles`: 본인 데이터만 수정 가능
- `hospital_members`: `master`만 소속 병원 스태프 관리 가능
- `admin`은 전체 접근 (RLS bypass)

---

## 7. 비기능 요구사항

- **보안**: 프로필 수정 시 현재 비밀번호 재확인 (민감 정보 변경 시)
- **감사 로그**: 역할 변경, 탈퇴 처리는 `operation_logs`에 기록
- **UX**: 탈퇴 처리는 되돌릴 수 없음을 명확히 경고
- **데이터 보존**: 탈퇴 후 최소 30일간 소프트딜리트 보존 검토

---

## 8. 관련 파일

| 파일 | 역할 |
|------|------|
| `components/UserProfile.tsx` | 내 프로필 UI |
| `components/MemberManager.tsx` | 병원 스태프 관리 UI |
| `components/system-admin/tabs/SystemAdminUsersTab.tsx` | 관리자 회원 목록 UI |
| `components/system-admin/SystemAdminOverlayModals.tsx` | 회원 상세 모달 |
| `services/authService.ts` | 인증/프로필/탈퇴 서비스 |
| `services/hospitalService.ts` | 스태프 초대/역할 서비스 |
| `supabase/functions/admin-delete-user/` | 관리자 강제 삭제 Edge Function |
| `supabase/functions/invite-member/` | 스태프 초대 Edge Function |

---

## 9. 다음 단계

- [ ] 정책 결정: `master` 탈퇴 시 병원 처리 방안
- [ ] 정책 결정: 계정 비활성화 vs 삭제 전략
- [ ] Design 단계: DB 스키마 확인 + UI 흐름 설계
- [ ] 구현 Phase 1 시작 (`/pdca do member-management`)
