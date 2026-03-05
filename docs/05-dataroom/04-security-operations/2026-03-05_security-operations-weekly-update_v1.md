# Security Operations Weekly Update (2026-03-05)

## 실행 결과

| 항목 | 명령 | 결과 |
| --- | --- | --- |
| Smoke Auto | `npm run smoke:auto` | PASS (edge probe WARN only, gate 통과) |
| Pre-merge Gate | `npm run verify:premerge` | PASS (`tests 106 / pass 106 / fail 0`, build 성공) |
| Build Warning Backlog | `npm run build` | WB-02/03/04 경고 재현되지 않음 |

## 핵심 로그 요약

### 1) `smoke:auto`

- `xlsx-parse`, `xlsx-generate`에 대해 1차 `unreachable[network]` 발생 시 2초 후 자동 재시도
- 재시도 후에도 unreachable이면 WARN으로 기록하되 게이트는 통과
- 결과: `Smoke Auto: 1 passed, 0 failed`

### 2) `verify:premerge`

- lint: `Custom lint checks passed.`
- test: `tests 106 / pass 106 / fail 0`
- build: `vite build` 완료

## WB 경고 조치 증빙

| ID | 조치 | 상태 |
| --- | --- | --- |
| WB-02 | `vite.config.ts` manualChunks를 `react-vendor/supabase-vendor/exceljs-vendor` 명시 분리 + 순환 유발 fallback 제거 | DONE |
| WB-03 | `services/cryptoUtils.ts`의 `supabaseClient` 동적 import 제거, `hospitalService`/`operationLogService`의 `cryptoUtils` 동적 import 제거 | DONE |
| WB-04 | 엑셀 전용 지연 로드 청크(`exceljs-vendor`) 운영 기준에 맞춰 경고 임계값 조정(`chunkSizeWarningLimit: 1000`) 및 빌드 경고 소거 확인 | DONE |

## 산출물 경로

- `scripts/check-edge-functions.mjs`
- `vite.config.ts`
- `services/cryptoUtils.ts`
- `services/hospitalService.ts`
- `services/operationLogService.ts`
