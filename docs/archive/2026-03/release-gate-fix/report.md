# release-gate-fix 완료 보고서

> **Match Rate**: 100%
> **완료일**: 2026-03-05
> **PDCA 단계**: Plan → Design → Do → Check → Report ✅
> **반복 횟수**: 0 (1회 구현으로 완료)

---

## 1. 배경 및 문제 정의

### 발견된 문제

`verify:premerge` 릴리즈 게이트의 첫 단계인 `smoke:ops`가 **체크리스트를 출력하고 항상 exit(0)** 을 반환하는 형식적 게이트였다.

```bash
# 문제 전 verify:premerge 체인
npm run smoke:ops  # ← 항상 통과, 아무것도 검증 안 함
  && npm run lint
  && npm run test
  && npm run build
```

```javascript
// scripts/operational-smoke-checklist.mjs (문제 코드)
const checklist = [/* 9개 항목 */];
console.log(...);  // 출력만 하고 exit(0) → 게이트 역할 없음
```

### 실질 공백

| 항목 | 문제 전 |
|---|---|
| `smoke:ops` | 항상 통과 — Edge Function 404 미탐지 |
| `smoke:edge` | `verify:release`에만 있음 — premerge에서 누락 |
| 개발자 인식 | "게이트 통과" 착각 유발 |

---

## 2. 해결 방안 요약

**핵심 원칙**: 자동/수동 게이트 명확히 분리

```
변경 전: smoke:ops(형식) → lint → test → build
변경 후: smoke:auto(실질) → lint → test → build
```

`smoke:ops`는 수동 참조용으로 보존, `smoke:auto`가 실제 자동 검증 담당.

---

## 3. 구현 결과

### 변경 파일 (4개)

| 파일 | 유형 | 내용 |
|---|---|---|
| `scripts/smoke-auto.mjs` | 신규 | Edge Function 자동 검증, 실패 시 exit(1) |
| `package.json` | 수정 | `smoke:auto` 추가, `verify:premerge` 교체 |
| `scripts/operational-smoke-checklist.mjs` | 수정 | 수동 체크리스트 역할 명시 주석 추가 |
| `docs/04-report/release-gate-policy.md` | 신규 | 자동/수동 게이트 정책 문서 |

### `scripts/smoke-auto.mjs` (핵심)

```javascript
// spawnSync로 check-edge-functions.mjs 실행
// 실패(404/auth 오류) 시 exit(1) → 파이프라인 차단
// 로컬(env 없음) 시 SKIP → 개발 흐름 유지
```

### `package.json` diff (2줄)

```diff
+ "smoke:auto": "node scripts/smoke-auto.mjs",
- "verify:premerge": "npm run smoke:ops && npm run lint && npm run test && npm run build",
+ "verify:premerge": "npm run smoke:auto && npm run lint && npm run test && npm run build",
```

---

## 4. 검증 결과

### Gap 분석 (100%)

| 요구사항 | 상태 |
|---|---|
| R-01: smoke-auto.mjs 작성, 실패 시 exit(1) | ✅ |
| R-02: package.json smoke:auto 추가 | ✅ |
| R-03: verify:premerge 교체 | ✅ |
| R-04: 통과/실패 요약 출력 | ✅ |
| R-05: smoke:ops 수동 참조용 유지 | ✅ |
| R-06: release-gate-policy.md 생성 | ✅ |
| R-07: operational-smoke-checklist.mjs 주석 | ✅ |

### 파이프라인 실행 결과

```
npm run verify:premerge
  smoke:auto  → xlsx-parse OK, xlsx-generate OK → 1 passed, 0 failed
  lint        → Custom lint checks passed
  test        → 104 passed, 0 failed
  build       → ✓ built in 2.14s
```

---

## 5. 게이트 비교 (Before / After)

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| premerge 1단계 | `smoke:ops` (항상 exit 0) | `smoke:auto` (실질 검증) |
| Edge Function 404 탐지 | premerge 미탐지 | **premerge에서 차단** |
| 로컬 환경 호환 | - | env 없으면 SKIP (graceful) |
| 수동 체크리스트 | `smoke:ops` (역할 불명확) | `smoke:ops` (수동 역할 명시) |
| 게이트 정책 문서 | 없음 | `release-gate-policy.md` |

---

## 6. 잔존 사항

| 항목 | 분류 | 내용 |
|---|---|---|
| 브라우저 E2E (항목 1~5) | Out of Scope | 별도 기획 필요 (Playwright 등) |
| `verify:release` 체인 | 미변경 | 기존 동작 유지, 문제 없음 |

---

## 7. 결론

릴리즈 게이트 실효성 문제를 **최소 변경(신규 파일 2개, 수정 2개)** 으로 해결했다.
`smoke:auto`가 Edge Function 404/auth 오류를 실제로 차단하며, 로컬 개발 환경에서는 graceful degradation으로 흐름을 방해하지 않는다.

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ (100%) → [Report] ✅
```
