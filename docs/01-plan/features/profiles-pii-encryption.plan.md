# Plan: Profiles PII Encryption

**Feature**: profiles-pii-encryption
**Status**: In Progress (Do Phase)
**Started**: 2026-02-23
**Author**: Claude Code

---

## 1. 개요

`profiles` 테이블의 개인식별정보(PII) — name, email, phone — 을 AES-GCM 방식(ENCv2 포맷)으로
암호화하여 저장한다. DB 레이어가 탈취되더라도 원문을 복원하기 어렵도록 보호하며,
이메일·전화번호는 SHA-256 해시 컬럼을 추가하여 검색 가능성을 유지한다.

기존에 수술기록(`surgery_records.patient_info`)에 적용된 동일 암호화 패턴을 `profiles`에
확장 적용하는 것이 핵심이다.

---

## 2. 배경 및 문제

| 현황 | 문제 |
|------|------|
| `profiles.name/email/phone` 평문 저장 | DB 직접 접근 시 PII 전체 노출 |
| Supabase auth.users.email 과 별도 profiles.email 이중 저장 | 암호화 후에도 auth.users는 평문 유지 (Supabase 제약) |
| 이메일/전화 평문 동등 조회 가능 | 해시 컬럼 없어 암호화 후 조회 불가 |
| VITE_PATIENT_DATA_KEY 클라이언트 번들 포함 | 키 노출 위험 (SEC-01, 현재 수용된 위험) |

---

## 3. 목표 및 비목표

### 목표
- `profiles` PII 3개 필드(name, email, phone)를 ENCv2 포맷으로 암호화
- `email_hash`, `phone_hash` 해시 컬럼으로 조회 성능 유지
- 기존 평문 데이터 Lazy Encryption (읽기 시 자동 암호화)
- 배치 마이그레이션으로 기존 평문 데이터 일괄 전환

### 비목표
- `auth.users.email` 암호화 (Supabase 제약으로 불가)
- SEC-01(클라이언트 키 노출) 근본 해결 — 별도 Edge Function 이전 작업으로 분리
- `hospitals` 테이블 암호화

---

## 4. 기술 설계 요약

### 암호화 방식
- **알고리즘**: AES-GCM 256-bit
- **키 도출**: PBKDF2 (SHA-256, 100,000회 반복, 고정 salt)
- **포맷**: `ENCv2:<base64(12B IV + ciphertext)>`
- **구현체**: `services/cryptoUtils.ts` (기존, surgery_records와 공유)

### 해시 방식
- **알고리즘**: SHA-256
- **Salt**: `ENCRYPTION_SECRET + ':' + value`
- **용도**: 중복/동등 조회 (결정론적)

### 하위 호환
- 평문(ENCv2 접두사 없음) → `decryptPatientInfo()` 그대로 반환
- ENCv1(XOR) → 레거시 복호화 지원

---

## 5. 구현 범위

### 완료된 작업 ✅

| 항목 | 파일 | 내용 |
|------|------|------|
| DB 마이그레이션 | `supabase/migrations/20260223020000_profiles_pii_encryption.sql` | email_hash, phone_hash 컬럼 + 인덱스 |
| 암호화 유틸 | `services/cryptoUtils.ts` | AES-GCM, PBKDF2, SHA-256 (기존) |
| Auth 서비스 | `services/authService.ts` | lazyEncryptProfile(), 해시 기반 조회, 쓰기 시 암호화 |
| 프로필 복호화 | `services/mappers.ts` | decryptProfile() |
| 병원 서비스 | `services/hospitalService.ts` | getMembers/getPendingMembers 복호화 적용 |
| UserProfile 컴포넌트 | `components/UserProfile.tsx` | 복호화된 값 표시, 암호화 후 저장 |
| SystemAdmin 대시보드 | `components/SystemAdminDashboard.tsx` | 암호화된 프로필 처리 |

### 남은 작업 ⏳

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| DB 마이그레이션 적용 | P0 | Supabase CLI `supabase db push` 또는 대시보드 실행 |
| 기존 평문 배치 마이그레이션 | P1 | 모든 hospital의 profiles 평문 데이터 일괄 암호화 |
| hospitalService.ts 이메일 조회 | P2 | 관리자 이메일 조회 함수 해시 기반 전환 확인 |
| SystemAdmin 회원 검색 | P2 | 이메일 검색 시 hash 조회 전환 여부 확인 |

---

## 6. 마이그레이션 전략

### 6-1. DB 스키마 적용
```bash
supabase db push
```

### 6-2. 기존 데이터 배치 암호화
Lazy encryption으로 읽기 시 자동 암호화되지만, 로그인하지 않는 비활성 회원은 영구 평문으로 남음.
`securityMaintenanceService` 패턴 참고하여 Admin 콘솔에서 배치 실행 기능 구현 검토.

### 6-3. 롤백 전략
- ENCv2 접두사 없는 값은 평문으로 처리하므로 암호화 컬럼 롤백은 해시 컬럼만 제거하면 됨
- `email_hash`, `phone_hash` 컬럼 DROP으로 롤백 가능

---

## 7. 보안 고려사항

| 항목 | 상태 | 비고 |
|------|------|------|
| DB 탈취 시 PII 보호 | ✅ 암호화로 해결 | AES-GCM 적용 후 원문 노출 불가 |
| RLS 정책 | ✅ 기존 유지 | profiles 테이블 RLS 그대로 |
| 클라이언트 키 노출 (SEC-01) | ⚠️ 수용된 위험 | VITE_ 환경변수 번들 포함 — 별도 이슈로 추적 |
| 해시 rainbow table | ✅ salt 적용 | ENCRYPTION_SECRET + ':' + value |

---

## 8. 완료 기준

- [ ] DB 마이그레이션 prod 적용 완료
- [ ] 신규 가입 회원: name/email/phone 암호화 저장 확인
- [ ] 기존 회원 로그인 시: lazy encryption 동작 확인
- [ ] 프로필 수정 후 암호화 저장 확인
- [ ] 전화번호로 이메일 찾기: 해시 조회 동작 확인
- [ ] SystemAdmin: 회원 목록 정상 표시 확인 (복호화)
- [ ] 배치 마이그레이션 실행 (선택적)

---

## 9. 참고 문서

- `docs/04-report/patient-encryption-migration-runbook.md` — surgery_records 마이그레이션 런북 (참고)
- `services/cryptoUtils.ts` — 암호화 구현체 및 SEC-01 경고 주석
- `supabase/migrations/20260223020000_profiles_pii_encryption.sql` — DB 마이그레이션
