# verify:premerge 리팩터링 계약 복구 TF 실행 로그 (2026-03-05)

## 1) 목표

- `verify:premerge` 실패 5건을 복구한다.
- 기능 코드는 변경하지 않고, 리팩터링 후 테스트 계약 불일치를 해소한다.
- 재발 방지를 위해 팀별 오너십/체크리스트를 운영 문서에 반영한다.

## 2) TF 구성 및 실행 역할

| 역할 | 담당 | 실행 항목 | 결과 |
| --- | --- | --- | --- |
| TF Lead / Gate Owner | 맹준호 | 실패 triage, 수정 범위 승인, 최종 게이트 판정 | 완료 |
| Contract Test Owner | 맹준호 | `legal-ux-hardening`, `mobile-critical-flow` 계약 정렬 | 완료 |
| App Shell Owner | 맹준호 | `showMobilePublicNav` 검증 대상을 `useAppLogic` 반영 | 완료 |
| Analyze Funnel Owner | 맹준호 | `useAnalyzePage`로 이동된 에러/이벤트 계약 반영 | 완료 |
| CI/Build Owner | 맹준호 | `verify:premerge` 전체 재실행, warning 분리 추적 | 완료 |
| Biz/PM Sponsor | denjoy | 우선순위 승인, 산출물 리뷰/공유 | 진행 |

## 3) 실패 원인 분류 (5건)

| 테스트 | 원인 분류 | 조치 |
| --- | --- | --- |
| `legal-ux-hardening` 모바일 토스트 오프셋 | App Shell 파생 상태가 훅으로 이동 | 테스트 계약 대상에 `hooks/useAppLogic.tsx` 추가 |
| `mobile-critical-flow` 모바일 핵심 동선 | 주문 콜백 wiring이 `workspaceProps`로 이동 | `App.tsx + useAppLogic.tsx` 결합 검증으로 변경 |
| `analyze` 업로드 체크리스트 | 계산 로직이 훅으로 이동 | `hooks/useAnalyzePage.ts`에서 계약 검증 |
| `analyze` 에러 분류/재시도 | 에러 분류 import/호출이 훅으로 이동 | 검증 대상을 `AnalyzePage` + `useAnalyzePage`로 분리 |
| 퍼널 이벤트 표준화 | `analyze_start/complete` 이벤트 emit 위치 이동 | 이벤트 계약을 훅 포함 검증으로 수정 |

판정: 전건 `리팩터링 후 테스트 계약 불일치`이며 기능 결함 아님.

## 4) 실행 결과

### 코드 변경 범위

- `scripts/legal-ux-hardening.test.mjs`
- `scripts/mobile-critical-flow.test.mjs`

### 검증 명령

```bash
npm run test
npm run verify:premerge
```

### 검증 결과

- `npm run test`: 105/105 PASS, fail 0
- `npm run verify:premerge`: PASS
  - `smoke:auto` PASS (unreachable warning 2건은 non-blocking)
  - `lint` PASS
  - `test` PASS
  - `build` PASS

## 5) 재발 방지 운영 규칙 (적용)

1. 리팩터링으로 상태/이벤트 로직이 훅으로 이동되면 테스트 계약 검증 대상을 컴포넌트 단일 파일로 고정하지 않는다.
2. 계약 테스트는 "행위(이벤트 emit, 콜백 wiring, guard 조건)"를 검증하고, 구현 위치(페이지/훅)는 허용 범위로 관리한다.
3. `verify:premerge` 실패 시 24시간 내 분류표(기능 결함 vs 계약 불일치)를 작성하고 tracker에 남긴다.
4. CI 경고는 실패 조건과 분리 관리한다. (예: build chunk warning은 백로그)

## 6) 다음 72시간 실행 항목

| ID | 항목 | 담당 | 완료 기준 | 기한 |
| --- | --- | --- | --- | --- |
| TF-01 | 계약 테스트 가이드 반영 검토 (10개 핵심 테스트) | Contract Test Owner | 단일 파일 고정 검증 0건 | 2026-03-06 |
| TF-02 | smoke/build warning 백로그 등록 | CI/Build Owner | 우선순위/담당/기한 기록 | 2026-03-06 |
| TF-03 | premerge 일일 실행 로그 2회 추가 | Gate Owner | 연속 실행 로그 누적 | 2026-03-07 |

## 7) 증빙

- 테스트 수정:
  - `scripts/legal-ux-hardening.test.mjs`
  - `scripts/mobile-critical-flow.test.mjs`
- 실행 로그:
  - 본 문서
  - `docs/05-dataroom/04-security-operations/verify-premerge-log-2026-03-05.md`
