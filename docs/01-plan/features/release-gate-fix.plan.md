# release-gate-fix Plan Document

> **Summary**: `verify:premerge` 릴리즈 게이트의 첫 단계인 `smoke:ops`가 체크리스트를
> 출력하고 exit(0)만 반환하여 실제 검증이 없는 형식적 게이트 문제 해결.
> `smoke:ops`를 자동 실행 가능한 `smoke:auto`로 교체하고, 수동 항목을 분리 문서화한다.
>
> **Author**: DevOps / Pipeline Engineer
> **Created**: 2026-03-05
> **Last Modified**: 2026-03-05
> **Status**: Draft

---

## 1. 문제 진단

### 1.1 현재 `verify:premerge` 체인

```json
// package.json:19
"verify:premerge": "npm run smoke:ops && npm run lint && npm run test && npm run build"
```

```javascript
// scripts/operational-smoke-checklist.mjs:3-21
const checklist = [/* 9개 항목 */];
for (const step of checklist) {
  console.log(`- ${step}`);   // 출력만 하고
}
// process.exit() 없음 → 항상 exit(0)
```

**문제**: `smoke:ops`가 파이프라인 첫 단계임에도 불구하고 항상 성공으로 반환.
아무것도 검증하지 않으면서 "통과" 신호를 줌.

### 1.2 게이트 항목별 현황

| # | 체크리스트 항목 | 자동화 가능 | premerge 실행 여부 |
|---|---|:---:|:---:|
| 1 | Auth 로그인 → 대시보드 | ❌ 브라우저 필요 | ❌ |
| 2 | 대시보드 탭 전환 | ❌ 브라우저 필요 | ❌ |
| 3 | 발주 상태 토글 | ❌ 브라우저 필요 | ❌ |
| 4 | 업로드 플로우 | ❌ 브라우저 필요 | ❌ |
| 5 | 모바일 쉘 네비게이션 | ❌ 브라우저 필요 | ❌ |
| 6 | `test:legalux` | ✅ | ✅ (`npm test` 글롭 포함) |
| 7 | `test:funnel` | ✅ | ✅ (`npm test` 글롭 포함) |
| 8 | `smoke:edge` | ✅ | ❌ (`verify:release`에만 있음) |
| 9 | `verify:premerge` 자체 | ✅ | ✅ (재귀적 언급) |

### 1.3 실질 공백

- **`smoke:edge` 누락**: Edge Function 404 탐지가 premerge에서 빠짐.
  배포 직전(`verify:release`)에만 실행되어 머지 후 배포 단계까지 회귀 미탐지.
- **`smoke:ops` 형식화**: 개발자에게 게이트 통과 착각 유도.
  실제 자동 검증 없이 항상 pass.

---

## 2. 해결 방향

### 2.1 원칙

1. **자동/수동 분리**: 브라우저 없이 실행 가능한 항목은 CI 게이트에 포함
2. **게이트 단순화**: `smoke:auto` 단일 진입점으로 자동화 항목 집약
3. **수동 체크리스트 보존**: 배포 전 인간 확인용으로 `smoke:ops` 유지

### 2.2 목표 구조

```
verify:premerge
  └─ smoke:auto       ← 신규 (자동화 항목)
       ├─ smoke:edge  ← Edge Function 404 탐지
       └─ (test:legalux, test:funnel은 이미 npm test에 포함)
  └─ lint             ← 기존 유지
  └─ test             ← 기존 유지
  └─ build            ← 기존 유지

smoke:ops             ← 수동 참조용 (배포 전 human checklist)
```

---

## 3. 요구사항

### 3.1 Must (자동화 게이트)

| ID | 요구사항 |
|----|----------|
| R-01 | `scripts/smoke-auto.mjs` 작성 — `smoke:edge` 실행 후 실패 시 exit(1) |
| R-02 | `package.json`에 `"smoke:auto"` 스크립트 추가 |
| R-03 | `verify:premerge`를 `smoke:auto`로 교체 (smoke:ops 제거) |
| R-04 | `smoke:auto` 실행 시 통과/실패 항목 수 요약 출력 |
| R-05 | `smoke:ops`는 수동 참조용으로 유지 (삭제 금지) |

### 3.2 Should (문서화)

| ID | 요구사항 |
|----|----------|
| R-06 | `docs/04-report/release-gate-policy.md` 생성 — 자동/수동 게이트 구분 명시 |
| R-07 | `operational-smoke-checklist.mjs` 상단에 "수동 체크리스트" 주석 추가 |

### 3.3 Could (미래 확장)

| ID | 요구사항 |
|----|----------|
| R-08 | Playwright 또는 Puppeteer 기반 브라우저 smoke test 준비 (1~5번 항목) |

---

## 4. 구현 상세

### 4.1 `scripts/smoke-auto.mjs` 설계

```javascript
// 역할: 자동화 가능한 smoke 검증 항목만 실행
// 1. smoke:edge (check-edge-functions.mjs) 호출
// 2. 결과 요약 출력
// 3. 실패 시 exit(1)로 파이프라인 차단

import { execSync } from 'node:child_process';

const checks = [
  { name: 'Edge Functions 상태 확인', cmd: 'node scripts/check-edge-functions.mjs' },
];

let passed = 0, failed = 0;
for (const check of checks) {
  try {
    execSync(check.cmd, { stdio: 'inherit' });
    passed++;
  } catch {
    console.error(`FAIL: ${check.name}`);
    failed++;
  }
}
console.log(`\nSmoke Auto: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

### 4.2 `package.json` 변경

```diff
- "smoke:ops": "node scripts/operational-smoke-checklist.mjs",
+ "smoke:ops": "node scripts/operational-smoke-checklist.mjs",
+ "smoke:auto": "node scripts/smoke-auto.mjs",
- "verify:premerge": "npm run smoke:ops && npm run lint && npm run test && npm run build",
+ "verify:premerge": "npm run smoke:auto && npm run lint && npm run test && npm run build",
```

---

## 5. 리스크

| Risk | Impact | Mitigation |
|------|--------|------------|
| `smoke:edge`가 환경변수 없으면 실패 | Medium | `--require-env` 없는 기본 모드 사용 |
| CI 환경에서 edge 엔드포인트 미접근 | Low | `check-edge-functions.mjs` 오프라인 모드 확인 |
| smoke:ops 제거로 기존 스크립트 참조 깨짐 | Low | smoke:ops 유지, premerge에서만 교체 |

---

## 6. 검증 명령

```bash
# 자동 게이트 단독 실행
npm run smoke:auto

# 전체 premerge 파이프라인 검증
npm run verify:premerge

# 수동 체크리스트 출력 (배포 전 참조)
npm run smoke:ops
```

완료 기준:
- `verify:premerge`가 smoke:auto 실패 시 파이프라인 차단 확인
- `smoke:auto`가 edge function 상태를 실제로 검증
- `smoke:ops`는 여전히 수동 참조용으로 동작

---

## 7. Scope

### In Scope
- [ ] `smoke-auto.mjs` 신규 작성
- [ ] `package.json` `smoke:auto` 추가 및 `verify:premerge` 교체
- [ ] `release-gate-policy.md` 작성
- [ ] `operational-smoke-checklist.mjs` 주석 보완

### Out of Scope
- 브라우저 E2E 테스트 프레임워크 도입 (R-08, 별도 기획)
- `verify:release` 체인 변경
- 기존 `lint`, `test`, `build` 스크립트 수정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial draft | DevOps Lead |
