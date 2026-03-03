# 보안 운영 증빙: RLS 권한 정책 인덱스

> **문서 ID**: S-02
> **생성일**: 2026-03-04
> **버전**: v1
> **담당**: SRE / Backend

---

## 개요

모든 데이터 접근은 Supabase Row Level Security(RLS)로 병원(hospital_id) 단위 격리.
아래는 적용된 보안 마이그레이션 목록과 각 정책의 역할을 정리한 인덱스.

---

## RLS 관련 마이그레이션 이력

| 파일명 | 적용일 | 주요 내용 |
|--------|--------|---------|
| `20260222170000_page_views_admin_rls_hardening.sql` | 2026-02-22 | page_views 테이블 admin RLS 강화 |
| `20260222180000_page_views_security_hardening.sql` | 2026-02-22 | page_views 보안 강화 |
| `20260222190000_rls_security_hardening.sql` | 2026-02-22 | 전체 RLS 보안 강화 |
| `20260222220000_fix_signup_hospital_id_rls.sql` | 2026-02-22 | 회원가입 hospital_id RLS 수정 |
| `20260223030000_operation_logs_admin_rls.sql` | 2026-02-23 | operation_logs admin RLS |
| `20260228010000_fix_rls_auth_uid_init_plan.sql` | 2026-02-28 | auth.uid() 초기화 플랜 수정 |
| `20260228020000_fix_base_rls_auth_uid_init_plan.sql` | 2026-02-28 | base RLS auth.uid() 수정 |
| `20260228030000_fix_rls_add_to_authenticated.sql` | 2026-02-28 | authenticated role RLS 추가 |
| `20260228040000_fix_rls_recursion_restore.sql` | 2026-02-28 | RLS 재귀 복원 |
| `20260301010000_fix_return_rpcs_security.sql` | 2026-03-01 | return RPC 보안 수정 |
| `20260302000000_fix_hospitals_admin_rls.sql` | 2026-03-02 | hospitals 테이블 admin RLS 수정 |

---

## 보안 아키텍처 원칙

### 1. Hospital 격리
- 모든 핵심 테이블에 `hospital_id = auth.jwt()->>'hospital_id'` RLS 적용
- 타 병원 데이터 접근 시도 → 0건 반환 (오류 아님)

### 2. 역할(Role) 체계
| 역할 | 권한 범위 |
|------|---------|
| `anon` | 공개 페이지 이벤트 삽입만 허용 (page_views) |
| `authenticated` | 소속 병원 데이터 CRUD |
| `admin` (병원 관리자) | 병원 내 멤버 관리, 설정 변경 |
| `system_admin` | 전체 관리자 (별도 Edge Function 제어) |

### 3. 암호화
- 환자 개인정보(phone): PBKDF2 + AES-256-GCM (crypto-service Edge Function)
- 키 캐시 TTL: 5분 (`PBKDF2_KEY_TTL_MS`)
- 중복 암호화 방지: `_lazyEncryptInFlight Set`

### 4. 보안 테스트 자동화
- `npm run test` → 보안 회귀 테스트 포함 (security-regression.test.mjs)
- `npm run verify:release` → 전체 게이트 통과 확인
- 암호화 검증: crypto-phase2-phase3.test.mjs

---

## 스모크 테스트 체크리스트 위치

`docs/04-report/security-smoke-test-checklist.md`

- 최종 업데이트: 2026-02-17
- 대상 마이그레이션: 021, 022, 024
- SQL 검증 쿼리: `supabase/023_postdeploy_verification.sql`, `supabase/025_verify_create_order_hotfix.sql`

---

## 다음 보안 검토 예정

| 항목 | 예정일 | 담당 |
|------|--------|------|
| batchUpdateInitialStock RPC INVOKER 전환 | 미정 | Backend |
| adjustStock race condition 해소 | 미정 | Backend |
| 스모크 체크리스트 최신화 (현재 2026-02-17) | 2026-03-10 | SRE |
