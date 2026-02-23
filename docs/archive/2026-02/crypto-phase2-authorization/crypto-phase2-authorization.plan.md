# Plan: crypto-phase2-authorization

## Overview

`crypto-security-hardening` Phase 1 완료 후 남은 Phase 2 항목 구현.
- **C-1**: `crypto-service` 인가(Authorization) 레이어 — 요청자 hospital_id 검증
- **C-4**: `hospitals.phone` 암호화 — 현재 평문 저장 중

## Background

- 2026-02-23 Phase 1 완료: verifyAuth 인증(Authentication) 구현
- Phase 1은 "이 사용자가 유효한 세션을 갖고 있는가" 만 검증
- Phase 2 목표: "이 사용자가 이 데이터를 복호화할 권한이 있는가" 검증
- 참조: `docs/02-design/features/crypto-security-hardening.design.md` Section 3

## 현황 분석

### C-1 현황

```
현재 흐름:
클라이언트 → crypto-service → verifyAuth() → /auth/v1/user → 200 → 복호화

문제:
- verifyAuth()는 JWT 유효성만 확인
- 어떤 병원의 데이터인지 전혀 모름
- 병원 A 직원이 병원 B의 ENCv2 암호문을 복사해 복호화 요청 가능

단, 실제 위험도:
- Supabase RLS가 DB 조회 시 hospital_id 격리 보장
- 암호문 탈취 자체가 이미 RLS 우회를 전제로 함
- 내부 위협(퇴사 직원 등) 시나리오에서 의미 있음
```

### C-4 현황

```typescript
// types.ts — DbHospital
phone: string | null;  // 현재 평문 저장

// DB에 저장된 값 예시
{ phone: "02-1234-5678" }  // 평문 노출
```

`hospitals` 테이블의 `phone`은 DB 직접 접근(Supabase Dashboard, 백업 파일 등) 시 평문 노출.
`profiles.phone`은 이미 암호화 완료.

## Goals

1. **C-4 (우선)**: `hospitals.phone` 암호화 — 범위 명확, 기술 부채 즉시 해소
2. **C-1 (신중하게)**: 인가 레이어 설계 후 구현 — 아키텍처 변경 수반, 성능 영향 검토 필요

## Scope

### In Scope

#### C-4: hospitals.phone 암호화

| 단계 | 내용 |
|------|------|
| DB 마이그레이션 | `hospitals.phone` 컬럼 암호화 지원 구조 |
| 기존 데이터 | lazy encrypt 패턴 (읽기 시 평문 감지 → 암호화 저장) |
| 새 데이터 | 병원 생성/수정 시 `hospitalService`에서 phone 암호화 |
| 복호화 | 병원 정보 표시 시 `decryptPatientInfo` 호출 |
| `DbHospital` 타입 | 변경 없음 (같은 `phone: string | null` 컬럼 재사용) |

#### C-1: verifyAuth 인가 레이어 (MVP)

**선택한 방식: JWT payload에서 hospital_id 추출**

| 단계 | 내용 |
|------|------|
| Supabase hook | `auth.users` → JWT `app_metadata.hospital_id` 자동 삽입 |
| Edge Function | `verifyAuth()` → `string \| null` (userId 반환)로 시그니처 변경 |
| 인가 구조 | `extractHospitalId(token)` 함수 추가, 향후 검증 확장 가능 |

> **중요**: C-1 MVP는 "인가 구조를 코드에 심는 것"이 목표.
> hospital_id 불일치 시 즉시 거부는 **복잡도가 높아 Phase 2 이후로 분리 가능**.
> 우선 구조만 완성하고 검증 로직을 추가할 수 있는 형태로 만든다.

### Out of Scope

- per-hospital 암호화 키 분리 (아키텍처 전면 변경)
- hospital_id mismatch 즉시 거부 (JWT claims 설정 안정화 이후)
- `hospitals` 테이블 기타 PII 필드 (name은 식별자이므로 제외)

## 구현 순서

```
[1] C-4 먼저
    1-1. DB 마이그레이션 작성 (hospitals.phone 암호화 방식 결정)
    1-2. hospitalService에서 phone 암호화/복호화 추가
    1-3. UI 표시 경로 확인 및 복호화 연결
    1-4. 기존 데이터 lazy encrypt 처리

[2] C-1 이후
    2-1. Supabase JWT hook 설정 (app_metadata.hospital_id 삽입)
    2-2. verifyAuth() 시그니처 변경 (→ Promise<string | null>)
    2-3. extractHospitalId() 헬퍼 추가
    2-4. 핸들러에서 userId 활용 구조 완성
```

## Success Criteria

- [ ] C-4: `hospitals` 테이블 phone 컬럼에 `ENCv2:` 값 저장 확인
- [ ] C-4: 병원 상세 화면에서 전화번호 정상 복호화 표시
- [ ] C-4: 기존 평문 데이터 lazy encrypt 동작 확인 (로드 후 DB 암호화됨)
- [ ] C-1: `verifyAuth()` 리턴값이 userId (`string | null`)로 변경
- [ ] C-1: JWT payload에서 hospital_id 추출 함수 구현
- [ ] 기존 encrypt/decrypt/hash 기능 회귀 없음

## Risks

| 리스크 | 설명 | 대응 |
|--------|------|------|
| C-4 lazy encrypt 시 `encryptPatientInfo` 인증 필요 | `hospitalService`는 인증 컨텍스트에서만 호출 → 문제 없음 | 확인 후 진행 |
| C-4 UI 표시 경로 누락 | hospitals.phone을 표시하는 컴포넌트 모두 복호화 처리 필요 | 구현 전 grep 전수조사 |
| C-1 JWT hook 설정 오류 | app_metadata 미설정 시 hospital_id 추출 실패 → 인가 없이 통과 | MVP에서 soft-fail (로그만) |
| C-1 기존 세션 | hook 적용 전 발급된 JWT에는 hospital_id 없음 → 재로그인 필요 | 배포 후 공지 |

## References

- Phase 1 완료 보고서: `docs/04-report/features/crypto-security-hardening.report.md`
- 이전 설계: `docs/02-design/features/crypto-security-hardening.design.md` Section 3
- 관련 파일: `supabase/functions/crypto-service/index.ts`, `services/hospitalService.ts`, `types.ts`
