# release-gate-fix Design Document

> **Summary**: `verify:premerge` 릴리즈 게이트 실효성 복구 상세 설계.
> `smoke-auto.mjs` 신규 스크립트 작성 + `package.json` 2줄 수정 +
> `operational-smoke-checklist.mjs` 주석 보완 + 정책 문서 생성.
>
> **Author**: DevOps / Pipeline Engineer
> **Created**: 2026-03-05
> **Status**: Draft

---

## 0. 사전 진단 (기존 코드 분석)

### `check-edge-functions.mjs` 동작 파악

| 조건 | 동작 |
|------|------|
| 환경변수 없음 + `--require-env` 없음 | `SKIP: Missing env` → `exit(0)` |
| 환경변수 없음 + `--require-env` | `FAIL` → `exit(1)` |
| 404 응답 | `FAIL: not deployed` → `exit(1)` |
| 401/403 응답 | `FAIL: auth rejected` → `exit(1)` |
| 504 cold-start | 5초 대기 후 재시도, 재시도 후도 504면 `WARN` (패스) |
| 네트워크 unreachable + `--fail-on-unreachable` 없음 | `WARN` (패스) |
| 200~499 정상 응답 | `OK` → 패스 |

**핵심 인사이트**: 로컬 개발 환경에서 `.env` 없으면 자동으로 SKIP(exit 0) → `smoke:auto`가
CI 환경에서만 실질 검증되고, 로컬에서는 개발 흐름을 방해하지 않음. **의도된 graceful degradation.**

### 변경 파일 목록

```
scripts/smoke-auto.mjs                            ← 신규 (R-01, R-04)
package.json                                      ← R-02, R-03
scripts/operational-smoke-checklist.mjs           ← R-07 (주석 추가)
docs/04-report/release-gate-policy.md             ← R-06 (신규)
```

---

## 1. `scripts/smoke-auto.mjs` 설계 (신규)

### 1-A. 역할 및 원칙

- **역할**: 자동 실행 가능한 smoke 항목만 모아 단일 진입점 제공
- **원칙**: subprocess로 기존 스크립트 호출 (중복 로직 없음)
- **환경 호환**: 로컬(env 없음) → SKIP gracefully, CI(env 있음) → 실질 검증

### 1-B. 구현

```javascript
#!/usr/bin/env node
/**
 * smoke-auto.mjs — 자동화 가능한 smoke 검증 항목 실행기
 *
 * 수동 체크리스트 항목(브라우저 필요)은 smoke:ops 참조.
 * CI 환경에서 env 변수가 설정된 경우에만 실질 검증됨.
 * 로컬 환경(env 없음)에서는 check-edge-functions.mjs가 자체적으로 SKIP 처리.
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const checks = [
  {
    name: 'Edge Functions 배포 상태 (xlsx-parse, xlsx-generate)',
    cmd: 'node',
    args: ['scripts/check-edge-functions.mjs'],
  },
];

let passed = 0;
let failed = 0;

console.log('Smoke Auto Checks');
console.log('=================');

for (const check of checks) {
  const result = spawnSync(check.cmd, check.args, { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(`[smoke-auto] PASS: ${check.name}`);
    passed++;
  } else {
    console.error(`[smoke-auto] FAIL: ${check.name}`);
    failed++;
  }
}

console.log('');
console.log(`Smoke Auto: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\n[smoke-auto] 자동 게이트 실패. 머지 전 수동 확인 필요: npm run smoke:ops');
  process.exit(1);
}
```

### 1-C. 출력 예시

**로컬 (env 없음):**
```
Smoke Auto Checks
=================
[edge-check] SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY
[smoke-auto] PASS: Edge Functions 배포 상태 (xlsx-parse, xlsx-generate)

Smoke Auto: 1 passed, 0 failed
```

**CI (env 있음, 정상):**
```
Smoke Auto Checks
=================
[edge-check] OK: xlsx-parse (HTTP 200)
[edge-check] OK: xlsx-generate (HTTP 200)
[edge-check] All edge function probes passed.
[smoke-auto] PASS: Edge Functions 배포 상태 (xlsx-parse, xlsx-generate)

Smoke Auto: 1 passed, 0 failed
```

**CI (env 있음, 404 실패):**
```
[edge-check] FAIL: xlsx-parse not deployed (HTTP 404)
[smoke-auto] FAIL: Edge Functions 배포 상태 (xlsx-parse, xlsx-generate)

Smoke Auto: 0 passed, 1 failed

[smoke-auto] 자동 게이트 실패. 머지 전 수동 확인 필요: npm run smoke:ops
→ exit(1) → verify:premerge 차단
```

---

## 2. `package.json` 변경 설계

### 변경 전 (현재)

```json
"smoke:ops": "node scripts/operational-smoke-checklist.mjs",
"smoke:edge": "node scripts/check-edge-functions.mjs",
"smoke:edge:strict": "node scripts/check-edge-functions.mjs --require-env --fail-on-unreachable",
"verify:premerge": "npm run smoke:ops && npm run lint && npm run test && npm run build",
"verify:release": "npm run smoke:edge:strict && npm run verify:premerge",
```

### 변경 후 (목표)

```json
"smoke:ops": "node scripts/operational-smoke-checklist.mjs",
"smoke:auto": "node scripts/smoke-auto.mjs",
"smoke:edge": "node scripts/check-edge-functions.mjs",
"smoke:edge:strict": "node scripts/check-edge-functions.mjs --require-env --fail-on-unreachable",
"verify:premerge": "npm run smoke:auto && npm run lint && npm run test && npm run build",
"verify:release": "npm run smoke:edge:strict && npm run verify:premerge",
```

**변경 diff (2줄):**
```diff
+   "smoke:auto": "node scripts/smoke-auto.mjs",
-   "verify:premerge": "npm run smoke:ops && npm run lint && npm run test && npm run build",
+   "verify:premerge": "npm run smoke:auto && npm run lint && npm run test && npm run build",
```

---

## 3. `operational-smoke-checklist.mjs` 주석 보완

### 변경 전 (현재 L1)

```javascript
#!/usr/bin/env node

const checklist = [
```

### 변경 후

```javascript
#!/usr/bin/env node
/**
 * operational-smoke-checklist.mjs — 수동 배포 전 체크리스트 (참조용)
 *
 * ⚠️  이 스크립트는 체크리스트를 출력하고 exit(0)을 반환합니다.
 *     실제 자동 검증은 smoke:auto (smoke-auto.mjs)가 담당합니다.
 *
 * 사용:
 *   npm run smoke:ops        ← 배포 전 인간이 확인할 항목 출력
 *   npm run smoke:auto       ← CI 자동 게이트 (verify:premerge에 포함)
 *   npm run verify:premerge  ← 전체 premerge 파이프라인
 */

const checklist = [
```

---

## 4. `docs/04-report/release-gate-policy.md` 설계

### 문서 구조

```markdown
# Release Gate Policy

## 자동 게이트 (CI 필수)
| 명령 | 항목 | 실패 시 |
|------|------|---------|
| smoke:auto | Edge Functions 404 탐지 | exit(1) — 머지 차단 |
| lint | TypeScript + 보안 패턴 | exit(1) — 머지 차단 |
| test | 전체 회귀 (funnel, legalux, security) | exit(1) — 머지 차단 |
| build | 타입체크 + 번들 | exit(1) — 머지 차단 |

## 수동 게이트 (배포 전 인간 확인)
| 항목 | 검증 방법 |
|------|-----------|
| Auth 로그인 → 대시보드 | 브라우저 수동 확인 |
| 대시보드 탭 전환 | 브라우저 수동 확인 |
| 발주 상태 토글 | 브라우저 수동 확인 |
| 업로드 플로우 | 브라우저 수동 확인 |
| 모바일 쉘 네비게이션 | 브라우저 수동 확인 |

## 실행 명령 참조
- npm run smoke:ops       ← 수동 체크리스트 출력
- npm run verify:premerge ← 자동 게이트 전체 실행
- npm run verify:release  ← 릴리즈 전 엄격 검증 (env 필수)
```

---

## 5. 구현 순서

```
Step 1: scripts/smoke-auto.mjs 작성 (신규)
Step 2: package.json — smoke:auto 추가 + verify:premerge 교체
Step 3: npm run smoke:auto 로컬 실행 확인 (SKIP 정상 확인)
Step 4: npm run verify:premerge 전체 파이프라인 확인
Step 5: scripts/operational-smoke-checklist.mjs 주석 추가
Step 6: docs/04-report/release-gate-policy.md 작성
```

---

## 6. 하위 호환성 분석

| 항목 | 변경 | 영향 |
|------|------|------|
| `smoke:ops` | 유지 (삭제 안 함) | 기존 참조 안전 |
| `smoke:edge` | 유지 | `verify:release` 체인 안전 |
| `smoke:edge:strict` | 유지 | `verify:release` 체인 안전 |
| `verify:release` | 미변경 | 릴리즈 파이프라인 안전 |
| `npm run test` | 미변경 | 기존 테스트 글롭 유지 |

**리스크 없음**: 신규 스크립트 추가 + `verify:premerge` 단일 항목 교체만.

---

## 7. 검증 기준

| 검증 항목 | 명령 | 기대 결과 |
|-----------|------|-----------|
| 로컬 smoke:auto | `npm run smoke:auto` | SKIP (env 없음) + exit(0) |
| premerge 파이프라인 | `npm run verify:premerge` | 전체 통과 |
| smoke:ops 유지 | `npm run smoke:ops` | 체크리스트 출력 (기존 동일) |
| CI 실패 시뮬레이션 | 임시 잘못된 URL로 실행 | `[smoke-auto] FAIL` + exit(1) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial design | DevOps Lead |
