# 보안 운영 증빙: verify:release 실행 결과

> **문서 ID**: S-01
> **생성일**: 2026-03-04
> **버전**: v1
> **담당**: SRE/Engineering Lead

---

## 실행 요약

| 항목 | 결과 |
|------|------|
| 실행 명령 | `npm run verify:release` |
| 실행 일시 (KST) | 2026-03-04 |
| 전체 결과 | **PASS** |
| P0 이슈 | 0건 |

---

## 단계별 결과

### 1. smoke:edge:strict (Edge Functions 상태)

```
[edge-check] OK: xlsx-parse   (HTTP 200)
[edge-check] OK: xlsx-generate (HTTP 200)
[edge-check] All edge function probes passed.
```

| Edge Function | 상태 | 인증 방식 |
|--------------|------|---------|
| xlsx-parse | ✅ HTTP 200 | JWT 검증 |
| xlsx-generate | ✅ HTTP 200 | JWT 검증 |

### 2. typecheck (TypeScript 컴파일)

```
> tsc --noEmit
(출력 없음 = 오류 0건)
```

- **오류 수**: 0건
- **경고**: 없음

### 3. test (자동화 테스트)

```
ℹ tests 100
ℹ pass  100
ℹ fail  0
ℹ duration_ms 66.915833
```

**테스트 카테고리별 결과**:

| 카테고리 | 통과 | 실패 |
|---------|------|------|
| 암호화 (C-4, C-1, H-2, H-5, H-7) | 22 | 0 |
| 퍼널 KPI 회귀 | 13 | 0 |
| 모바일 핵심 동선 | 12 | 0 |
| 보안 회귀 | 8 | 0 |
| 주문/RPC 서비스 | 4 | 0 |
| 탈퇴/계정 삭제 프로세스 | 13 | 0 |
| 기타 (사이즈/법무/공지) | 28 | 0 |

### 4. build (프로덕션 빌드)

```
✓ 274 modules transformed.
✓ built in 3.53s
```

- **번들 이상**: 없음
- **빌드 오류**: 0건
- **주요 청크 크기**: index.js 212.99kB (gzip 60.77kB)

---

## 보안 관련 테스트 통과 목록

| 테스트 | 결과 | 보안 항목 |
|--------|------|---------|
| `rich HTML sinks are sanitized` | ✅ | XSS 방어 |
| `phase2 SQL migration keeps critical permission guards` | ✅ | RLS 권한 |
| `gemini api key is not injected into client bundle` | ✅ | 시크릿 노출 방지 |
| `payment request uses edge proxy instead of client webhook url` | ✅ | SSRF 방어 |
| `payment proxy validates auth scope before forwarding webhook` | ✅ | 인증 범위 검증 |
| `crypto utils request auth token for encryption and decryption` | ✅ | 암호화 인증 |
| `crypto utils use anon key only for api gateway routing` | ✅ | 키 사용 범위 제한 |
| `authService: _lazyEncryptInFlight Set` (중복 방지) | ✅ | Race condition 방어 |
| `maskNameForLog / maskEmailForLog` | ✅ | PII 로그 마스킹 |

---

## 결론

2026-03-04 기준 `verify:release` 전체 통과. P0 보안 이슈 없음.
다음 실행 예정: premerge 시마다 + 다음 릴리즈 전.
