# Build Resolve Warning 재검증 확정 (2026-03-05)

## 목적

`npm run verify:premerge` 반복 실행 시 간헐적으로 관찰되던
`didn't resolve at build time` 경고 재발 여부를 확정 검증한다.

## 실행 조건

- 날짜: 2026-03-05
- 실행 명령: `npm run verify:premerge`
- 반복 횟수: 3회 연속
- 로그 파일:
  - `/tmp/verify_premerge_resolve_confirm_run1.log`
  - `/tmp/verify_premerge_resolve_confirm_run2.log`
  - `/tmp/verify_premerge_resolve_confirm_run3.log`
- 탐지 패턴:
  - `didn't resolve at build time`
  - `referenced in`
  - `[build-resolve-trace]`

## 결과 요약

| Run | Smoke Auto | Test | Build | Resolve 경고 패턴 |
| --- | --- | --- | --- | --- |
| 1 | PASS | `tests 106 / pass 106 / fail 0` | `built in 4.04s` | 미검출 |
| 2 | PASS | `tests 106 / pass 106 / fail 0` | `built in 4.33s` | 미검출 |
| 3 | PASS | `tests 106 / pass 106 / fail 0` | `built in 4.01s` | 미검출 |

## 판단

1. 3회 연속 `verify:premerge`에서 빌드 경고 재현 없음
2. `noise.svg` 기반 임의 URL 클래스 제거 + `noise-bg` 공통 클래스 전환 이후 안정화 확인
3. 네트워크 기반 `smoke:auto` WARN(unreachable 재시도 로그)은 존재하나 본 이슈와 무관

## 결론

`didn't resolve at build time` 경고는 2026-03-05 재검증 기준 **종결(Resolved)** 로 확정한다.
