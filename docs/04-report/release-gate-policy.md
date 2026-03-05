# Release Gate Policy

> **작성일**: 2026-03-05
> **적용 버전**: verify:premerge v2 (smoke:auto 도입)

---

## 1. 게이트 구조

```
verify:premerge
  ├─ smoke:auto       ← 자동 게이트 (CI 필수)
  ├─ lint             ← TypeScript + 보안 패턴
  ├─ test             ← 전체 회귀 테스트
  └─ build            ← 타입체크 + 번들

verify:release (배포 직전 엄격 검증)
  ├─ smoke:edge:strict ← env 필수 + unreachable 실패
  └─ verify:premerge   ← 위 전체 포함
```

---

## 2. 자동 게이트 (CI 필수)

실패 시 머지/배포 **차단** — 인간 개입 없이 자동 판정.

| 명령 | 검증 항목 | 실패 조건 |
|------|-----------|-----------|
| `smoke:auto` | Edge Functions 404/auth 탐지 | 404 또는 401/403 응답 |
| `lint` (typecheck) | TypeScript 타입 오류 | 컴파일 에러 |
| `lint` (lint-check) | XSS 패턴, 보안 SQL 가드, VITE 환경변수 오용 | 금지 패턴 감지 |
| `test` | funnel CVR, legalux, security 회귀 | 테스트 실패 |
| `build` | 타입체크 + Vite 번들 | 빌드 에러 |

**환경변수 없는 로컬 실행**: `smoke:auto`는 env 미설정 시 자동 SKIP(exit 0) → 로컬 개발 흐름 유지.

---

## 3. 수동 게이트 (배포 전 인간 확인)

브라우저가 필요한 항목 — `npm run smoke:ops`로 체크리스트 출력.

| # | 항목 | 검증 방법 |
|---|------|-----------|
| 1 | Auth: 유효한 계정으로 로그인 → 대시보드 진입 | 브라우저 수동 확인 |
| 2 | 대시보드 탭 전환 (overview → inventory_master → order_management → fail_management) | 브라우저 수동 확인 |
| 3 | 발주 상태 토글 → UI 갱신 확인 | 브라우저 수동 확인 |
| 4 | 업로드 플로우: 원시데이터 업로드 탭 → 파일 선택 | 브라우저 수동 확인 |
| 5 | 모바일 쉘: md:hidden 뷰포트에서 하단 네비게이션 표시 | 브라우저 수동 확인 |

---

## 4. 실행 명령 참조

```bash
# 개발자 일상 (자동)
npm run verify:premerge     # smoke:auto + lint + test + build

# 배포 전 수동 확인
npm run smoke:ops           # 수동 체크리스트 출력

# 릴리즈 전 엄격 검증 (CI env 필요)
npm run verify:release      # smoke:edge:strict + verify:premerge
```

---

## 5. 게이트 도입 이력

| 날짜 | 변경 | 이유 |
|------|------|------|
| 2026-03-05 | `smoke:auto` 도입, `verify:premerge` 교체 | `smoke:ops`가 항상 exit(0) → 형식적 게이트 해소 |
| 2026-03-05 | 리팩터링 계약 가드레일 추가 (`App/useAppLogic`, `AnalyzePage/useAnalyzePage`) | 로직 이동 시 정규식 계약 불일치 재발 방지 |
| 이전 | `smoke:ops` (체크리스트 출력만) | 실효성 없음 |

---

## 6. 리팩터링 계약 가드레일 (운영 규칙)

테스트 계약의 목적은 "행위 보장"이다. 구현 파일 위치는 리팩터링으로 이동될 수 있으므로 아래 기준으로 검증한다.

1. 이벤트 계측 계약: 단일 컴포넌트 고정이 아니라 컴포넌트 + 관련 훅 범위를 함께 검증한다.
2. 앱 셸 파생 상태 계약: `App.tsx`에서 직접 계산되지 않아도 `useAppLogic` 등 소유 훅에서 계산되면 통과로 본다.
3. 콜백 wiring 계약: 최종 렌더 트리에서 전달 보장이 확인되면 중간 번들(`workspaceProps`) 경유를 허용한다.
4. 실패 분류 규칙: `verify:premerge` 실패 시 24시간 내 `기능 결함 / 계약 불일치`를 분류해 tracker에 기록한다.
