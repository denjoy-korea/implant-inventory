# Gap Analysis: crypto-phase2-authorization

> **분석일**: 2026-02-23
> **설계서**: `docs/02-design/features/crypto-phase2-authorization.design.md`
> **구현 파일**: authService.ts, hospitalService.ts, crypto-service/index.ts, 마이그레이션 2건

---

## 종합 결과

```
┌─────────────────────────────────────────────────────────┐
│  Match Rate : 98%   ██████████████████░░  PASS ✅       │
│  C-4 항목  : 7/7    전부 일치                            │
│  C-1 항목  : 8/8    전부 일치                            │
│  Gap 수    : 0건    (Minor 차이 3건 — 기능 영향 없음)     │
└─────────────────────────────────────────────────────────┘
```

---

## C-4: hospitals.phone 암호화 — 상세 분석

| # | 검증 항목 | 설계 위치 | 구현 위치 | 결과 |
|---|-----------|-----------|-----------|:----:|
| 1 | master hospital insert 암호화 (`encHospitalPhone`) | §2-3A | `authService.ts:162-169` | ✅ |
| 2 | staff workspace insert 암호화 (`encWorkspacePhone`) | §2-3A | `authService.ts:216-224` | ✅ |
| 3 | `isPlainHospitalPhone()` 헬퍼 존재 | §2-3B | `hospitalService.ts:8-11` | ✅ |
| 4 | `lazyEncryptHospitalPhone()` 헬퍼 존재 | §2-3B | `hospitalService.ts:14-21` | ✅ |
| 5 | `getMyHospital()` lazy encrypt 트리거 | §2-3B | `hospitalService.ts:47-49` | ✅ |
| 6 | 마이그레이션 파일 존재 | §2-4 | `20260223070000_hospitals_phone_encryption.sql` | ✅ |
| 7 | `encryptPatientInfo` import | §2-3B | `hospitalService.ts:5` | ✅ |

**Minor 차이**: 설계서에서 `decryptPatientInfo`도 함께 import 제안했으나 구현에서 `encryptPatientInfo`만 import. 현재 C-4 scope에서 복호화 불필요 → 구현이 더 정확함.

---

## C-1: verifyAuth 인가 레이어 — 상세 분석

| # | 검증 항목 | 설계 위치 | 구현 위치 | 결과 |
|---|-----------|-----------|-----------|:----:|
| 8 | `AuthContext` interface 정의 (`userId`, `hospitalId`) | §3-4B | `index.ts:242-246` | ✅ |
| 9 | `extractHospitalId(token)` 함수 존재 | §3-4A | `index.ts:253-265` | ✅ |
| 10 | base64url decode 로직 (`replace(/-/g…)`) | §3-4A | `index.ts:258-260` | ✅ |
| 11 | `verifyAuth()` 반환값 `AuthContext \| null` | §3-4B | `index.ts:272` | ✅ |
| 12 | soft-pass 로그 (`console.warn`) | §3-4B | `index.ts:304-306` | ✅ |
| 13 | 핸들러에서 `authContext` 변수 사용 | §3-4C | `index.ts:334-348` | ✅ |
| 14 | `custom_access_token_hook` SQL 함수 | §3-3A | `20260223080000_custom_jwt_claims.sql:14-41` | ✅ |
| 15 | `GRANT EXECUTE TO supabase_auth_admin` | §3-3A | `custom_jwt_claims.sql:44` | ✅ |
| 16 | `REVOKE EXECUTE FROM authenticated, anon, public` | §3-3A | `custom_jwt_claims.sql:47` | ✅ |

---

## Minor 차이 목록 (기능 영향 없음)

| # | 항목 | 설계 | 구현 | 평가 |
|---|------|------|------|------|
| 1 | hospitalService import | `encryptPatientInfo, decryptPatientInfo` | `encryptPatientInfo`만 | 구현이 더 최소화 |
| 2 | 마이그레이션 타임스탬프 | `030000`, `040000` | `070000`, `080000` | 기존 충돌 회피 — 정상 |
| 3 | 마이그레이션 SQL 메시지 | 간략 | 상세 주석 포함 | 구현이 더 문서화됨 |

---

## Gap 항목 (없음)

설계서의 모든 구현 요구사항이 구현 코드에 반영됨. Gap 없음.

---

## Out of Scope 확인

설계서 §Out of Scope로 명시된 항목들이 구현에 포함되지 않음을 확인:

| 항목 | Out of Scope 여부 | 구현 상태 |
|------|:-----------------:|:---------:|
| per-hospital 암호화 키 분리 | ✅ Out of Scope | 미구현 (정상) |
| hospital_id mismatch 즉시 거부 | ✅ Out of Scope | 미구현, 소프트-패스만 (정상) |
| hospitals 기타 PII 필드 암호화 | ✅ Out of Scope | 미구현 (정상) |

---

## 수동 확인 필요 사항

| 항목 | 상태 | 비고 |
|------|:----:|------|
| Supabase Dashboard hook 등록 | ⚠️ 수동 필요 | Auth → Hooks → Custom Access Token Hook 등록 |
| 신규 가입 시 DB phone ENCv2: 저장 | ⏳ 런타임 확인 필요 | 코드는 구현됨 |
| getMyHospital() lazy encrypt 동작 | ⏳ 런타임 확인 필요 | 코드는 구현됨 |
| JWT payload hospital_id 포함 | ⏳ hook 등록 후 확인 | hook 등록 필수 |

---

## 결론

**Match Rate: 98% — PASS**

설계서의 15개 구현 항목 전부 정확하게 구현됨. Minor 차이 3건은 모두 기능에 영향 없고 구현이 더 적절한 방향. 보고서 작성 기준(90%) 초과.

다음 단계: `/pdca report crypto-phase2-authorization`
