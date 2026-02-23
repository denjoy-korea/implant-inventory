# Plan: crypto-security-hardening

## Overview
암호화 파이프라인 코드 분석을 통해 발견된 보안 취약점 및 잠재적 버그를 수정한다.
분석 결과 Critical 4건, High 7건, Medium 5건이 확인되었으며,
우선순위에 따라 단계적으로 수정한다.

## Background
- 2026-02-23 `bkit:code-analyzer`로 `crypto-service` 및 관련 파일 분석 완료
- Supabase Edge Function `crypto-service` + 클라이언트 `cryptoUtils.ts` + `mappers.ts` 대상
- 환자 PII(이름/이메일/전화번호) 암호화 파이프라인의 보안 강화 필요

## Goals
1. Critical 취약점 전수 해결 (C-1 ~ C-4)
2. High 우선순위 버그 해결 (H-1, H-4, H-6 즉시 / H-2, H-3, H-5 단계적)
3. 보안 회귀 방지를 위한 테스트 기준 정립

## Scope

### In Scope

#### Phase 1 — 즉시 수정 (Critical + High 긴급)
| ID | 대상 파일 | 내용 |
|----|-----------|------|
| C-3 | `crypto-service/index.ts` | `verifyAuth()`에서 `SUPABASE_SERVICE_ROLE_KEY` 제거, `SUPABASE_ANON_KEY`만 사용 |
| C-2 | `crypto-service/index.ts` | `hash` op에 rate limiting 또는 JWT 필수 인증 추가 |
| H-4 | `services/mappers.ts` | `decryptProfile` catch 블록 — DB 쓰기 경로에서 placeholder 반환 방지 |
| H-6 | `services/cryptoUtils.ts` | `getValidToken()` 동시 호출 시 단일 refresh promise 공유 (mutex 패턴) |
| H-1 | `services/cryptoUtils.ts` | `callCryptoService` 반환값 undefined 방어 코드 추가 |

#### Phase 2 — 설계 후 수정 (Critical 설계 변경)
| ID | 대상 파일 | 내용 |
|----|-----------|------|
| C-1 | `crypto-service/index.ts` | `verifyAuth()` → 인가(authorization) 레이어 추가. 요청자 hospital_id 확인 |
| C-4 | `supabase/migrations/` | `hospitals.phone` 암호화 마이그레이션 |

#### Phase 3 — 중간 우선순위 (High 나머지)
| ID | 대상 파일 | 내용 |
|----|-----------|------|
| H-2 | `crypto-service/index.ts` | PBKDF2 키 캐시 TTL (5분) 또는 버전 체크 추가 |
| H-3 | `crypto-service/index.ts` | PATIENT_DATA_KEY 미설정 시 명시적 에러 반환, silent fallback 제거 |
| H-5 | `services/authService.ts` | `lazyEncryptProfile` 중복 실행 방지 (DB conditional update) |
| H-7 | `services/authService.ts` | Slack notify-signup에서 PII 마스킹 처리 |

### Out of Scope
- M-1 (ENC: prefix legacy 데이터 재암호화 마이그레이션) — 별도 배치 작업
- M-6 (per-record salt 추가) — 기존 데이터 호환성 파괴, 장기 로드맵
- C-1의 완전한 hospital-scoped 암호화 키 분리 — 아키텍처 전면 변경 필요

## Success Criteria
- [ ] C-3: `verifyAuth()`가 SUPABASE_ANON_KEY만 사용
- [ ] C-2: hash op이 인증 없이 무제한 호출 불가
- [ ] H-4: placeholder가 실제 DB 데이터를 덮어쓰는 경로 없음
- [ ] H-6: 동시 refreshSession() 호출이 1회로 제한됨
- [ ] H-1: undefined 반환 시 명시적 에러 throw
- [ ] 기존 암/복호화 기능 회귀 없음 (프로덕션 smoke test 통과)

## Risks
- **C-1 인가 레이어**: hospital_id를 JWT claim에 포함시키려면 Supabase Auth custom claims 또는 별도 DB 조회 필요 → 성능 영향 검토 필요
- **C-4 hospitals.phone 암호화**: 기존 평문 데이터 마이그레이션 시 서비스 중단 없이 처리해야 함
- **H-2 키 캐시 TTL**: Edge Function cold start 시간 증가 가능 (PBKDF2 100k 이터레이션)

## References
- 분석 결과: `bkit:code-analyzer` 실행 결과 (2026-02-23)
- 관련 커밋: `531e93e`, `e16ef1b`, `cc5a9f1` (crypto-service 401 수정 시리즈)
- 파일: `services/cryptoUtils.ts`, `supabase/functions/crypto-service/index.ts`, `services/mappers.ts`, `services/authService.ts`
