# Release Warning Backlog (TF-02) — 2026-03-05

## 범위

- 대상 실행: `npm run verify:premerge`
- 기준 로그: `2026-03-05` TF-03 run1/run2 (`/tmp/verify_premerge_tf03_run1.log`, `/tmp/verify_premerge_tf03_run2.log`)
- 목적: 실패 조건은 아니지만 반복 경고를 우선순위/담당/기한으로 관리

## 백로그

| ID | 경고 | 영향 | 우선순위 | 담당 | 기한 | 조치 계획 |
| --- | --- | --- | --- | --- | --- | --- |
| WB-01 | `smoke:auto`에서 `xlsx-parse`, `xlsx-generate` unreachable WARN 간헐 발생 | 배포/네트워크 상태 판단 노이즈 증가 | P2 | CI/Build Owner (맹준호) | 2026-03-06 | edge-check 재시도(백오프) 1회 추가, 로그에 네트워크/권한 구분 코드 표기 |
| WB-02 | Vite `Circular chunk: vendor -> react-vendor -> vendor` 경고 | 청크 분리 효율 저하 가능성 | P2 | Frontend Owner (맹준호) | 2026-03-07 | `build.rollupOptions.output.manualChunks` 재정렬 설계안 작성 |
| WB-03 | `supabaseClient.ts`/`cryptoUtils.ts` 정적+동적 import 혼재 경고 | 코드 스플릿 최적화 제한 | P2 | Frontend Owner (맹준호) | 2026-03-07 | 동적 import 경로 정리 또는 정적 import 통일 여부 결정 |
| WB-04 | `exceljs-vendor` 청크 500kB 초과 경고 | 초기 로드/캐시 효율 저하 가능성 | P1 | Frontend Owner (맹준호) | 2026-03-08 | 엑셀 기능 경로 lazy-load 강제 및 청크 분리 검증 |

## 완료 기준

1. 각 항목별 개선 PR 또는 "미적용 사유" 문서화
2. `verify:premerge` 2회 연속 실행 시 동일 경고 발생 여부 비교 로그 첨부
