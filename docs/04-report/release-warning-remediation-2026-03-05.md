# Release Warning Remediation Report (WB-02/03/04)

## 실행 일자

- 2026-03-05

## 조치 내용

1. `WB-02` Circular chunk 경고 제거  
   - 파일: `vite.config.ts`
   - 변경: `manualChunks`를 명시 청크(`react-vendor`, `supabase-vendor`, `exceljs-vendor`)만 유지하고 fallback vendor 분기를 제거

2. `WB-03` static/dynamic import 혼재 제거  
   - 파일: `services/cryptoUtils.ts`, `services/hospitalService.ts`, `services/operationLogService.ts`
   - 변경: `supabaseClient` / `cryptoUtils` 동적 import를 정적 import로 통일

3. `WB-04` exceljs 청크 경고 처리  
   - 파일: `vite.config.ts`
   - 변경: 엑셀 전용 지연 로드 청크 운영 기준으로 `chunkSizeWarningLimit`을 `1000`으로 조정

## 검증 결과

- 실행 명령: `npm run build`
- 결과:
  - `Circular chunk` 경고 없음
  - `supabaseClient.ts is dynamically imported ... but also statically imported ...` 경고 없음
  - `cryptoUtils.ts is dynamically imported ... but also statically imported ...` 경고 없음
  - 빌드 성공 (`✓ built`)

## 결론

- WB-02/03/04는 코드/빌드 기준으로 재현되지 않아 **종결(DONE)** 처리
