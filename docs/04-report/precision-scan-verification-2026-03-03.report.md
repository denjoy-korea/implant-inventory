# 정밀 스캔 검증 보고서 (수정 실행 금지)

- 작성일: 2026-03-03
- 목적: 정밀 스캔 결과를 바탕으로 **수정 후보를 리스트로만 확정**하고, 실제 수정 없이 검증 기준을 명시한다.
- 원칙: 코드/SQL/설정 변경 금지, 배포 작업 금지, 문서화와 검증 항목 정의만 수행.

## 1) 확정된 수정 후보 리스트

1. `[P0][A1] payment-request-proxy CORS 스코프 정합화`
- 대상 파일: `supabase/functions/payment-request-proxy/index.ts`
- 관찰 근거:
- `buildCallbackUrl` 내부에서 `req`가 스코프 밖 참조됨.
- `jsonResponse`와 `OPTIONS` 처리에서 `corsHeaders`가 전역처럼 사용되나 명시적 선언 컨텍스트가 불명확함.
- 제안 수정(실행 금지):
- 요청 단위 `corsHeaders` 생성 위치를 `Deno.serve` 핸들러 최상단으로 통일.
- `jsonResponse`가 `corsHeaders`를 명시적으로 받도록 함수 시그니처 정리.
- `buildCallbackUrl` 내부의 불필요한 `getCorsHeaders(req)` 제거.
- 검증 기준:
- Edge Function 빌드/실행 시 `ReferenceError` 없음.
- `OPTIONS`/`POST` 응답 모두 CORS 헤더 일관성 유지.

2. `[P0][A1] payment-callback CORS 스코프 정합화`
- 대상 파일: `supabase/functions/payment-callback/index.ts`
- 관찰 근거:
- `jsonResponse`가 `corsHeaders`를 참조하지만 해당 심볼이 함수 외부에서 안정적으로 보장되지 않음.
- `OPTIONS` 분기 역시 동일 심볼 의존.
- 제안 수정(실행 금지):
- `Deno.serve` 시작 시 `const corsHeaders = getCorsHeaders(req)`를 단일 생성.
- `jsonResponse`를 `jsonResponse(corsHeaders, body, status)` 형태로 변경해 스코프 의존 제거.
- `parseBody` 내 로컬 `corsHeaders` 선언 제거.
- 검증 기준:
- 콜백 토큰 검증 성공/실패 케이스 모두 정상 JSON 응답.
- `process_payment_callback` RPC 호출 성공 경로와 실패 경로에서 헤더 일관성 유지.

3. `[P1][A3] TRIAL_DAYS 단일 소스 정책 정렬`
- 대상 파일:
- `components/system-admin/systemAdminDomain.ts`
- `types.ts`
- 관찰 근거:
- 시스템 관리자 도메인은 `TRIAL_DAYS = 14`, 공통 타입은 `TRIAL_DAYS = 28`로 상충.
- 제안 수정(실행 금지):
- 정책 상수를 공통 원천 1곳으로 통일하고 소비 계층에서 import 사용.
- 관리자 도메인 계산 로직이 공통 상수를 참조하도록 교체.
- 검증 기준:
- 관리자 화면의 trial 종료일 계산과 공통 정책 안내 문구가 동일 값으로 일치.

4. `[P1][A5] 모바일 핵심 동선 테스트 계약 정렬`
- 대상 파일:
- `scripts/mobile-critical-flow.test.mjs`
- `components/app/DashboardWorkspaceSection.tsx`
- `components/dashboard/DashboardOperationalTabs.tsx`
- `App.tsx`
- 관찰 근거:
- 현재 `npm run verify:premerge`에서 `mobile critical operations stay wired in dashboard routes` 테스트 실패.
- 테스트 정규식 기대치와 실제 props 명칭/연결 방식 간 계약 드리프트가 존재.
- 제안 수정(실행 금지):
- 테스트 기대치를 현재 아키텍처(WorkspaceSection 경유 전달, props 네이밍)와 동기화하거나,
- 반대로 코드 계약을 테스트 기대치에 맞추는 단일 기준 결정.
- 검증 기준:
- `npm run verify:premerge` 전부 통과.
- 모바일 네비게이션 및 주문/불량/재고 감사 핵심 핸들러 연결 단절 없음.

5. `[P2][A2] 결제 플로우 회귀 검증 케이스 보강`
- 대상 파일:
- `scripts/*.test.mjs` (결제 프록시/콜백 관련 정적 검증 영역)
- `supabase/functions/payment-request-proxy/index.ts`
- `supabase/functions/payment-callback/index.ts`
- 관찰 근거:
- 결제 함수는 보안 민감 경로이며, 최근 코드 변화 대비 회귀 테스트 강도가 상대적으로 약함.
- 제안 수정(실행 금지):
- 토큰 누락/불일치/잘못된 `billing_id`/환경변수 누락/비정상 status 파싱 케이스를 최소 세트로 명시.
- 검증 기준:
- 보안 실패 경로가 모두 기대 status code와 메시지로 수렴.

## 2) 에이전트 팀 운영 계획 (검증 모드)

1. `A0 오케스트레이터`
- 역할: 우선순위/의존성/완료 기준 통제.
- 산출물: 일일 리스크 보드, 항목별 상태(`open/ready/verified`).

2. `A1 런타임 안정화`
- 역할: P0 Edge Function 스코프/응답 계약 검증.
- 산출물: 수정 초안 리스트, 재현 시나리오 문서.

3. `A2 데이터·보안`
- 역할: 결제/권한/RLS 연계 리스크 식별 및 검증 조건 정의.
- 산출물: 실패 경로 매트릭스(인증/권한/입력/환경변수).

4. `A3 도메인 정합성`
- 역할: 정책 상수 단일 소스 정렬안 작성.
- 산출물: 상수 원천화 결정서(소스 파일, 참조 경로, 영향 범위).

5. `A4 사용자 동선`
- 역할: 모바일 핵심 동선 계약 점검(App-Workspace-Tabs).
- 산출물: 핸들러 연결 매핑표.

6. `A5 품질 게이트`
- 역할: 실패 테스트 원인 분류(테스트 문제 vs 코드 문제)와 기준선 정리.
- 산출물: 게이트 복구 계획서와 통과 기준.

7. `A6 보고·릴리즈`
- 역할: 수정 전/후 검증 증적 포맷 정의.
- 산출물: 최종 검증 패키지 템플릿(명령, 로그, 판정 기준).

## 3) 실행 금지 범위(이번 요청 기준)

1. 코드 변경 금지.
2. SQL 마이그레이션 추가/수정 금지.
3. Edge Function 배포 금지.
4. 운영 환경값 변경 금지.

## 4) 검증 체크리스트 (수정 전 기준선)

1. `npm run verify:premerge` 실행 결과와 실패 테스트 ID 기록.
2. P0 대상 파일에서 스코프 불일치 참조 위치 라인 고정.
3. TRIAL_DAYS 불일치 위치 라인 고정.
4. 모바일 라우팅/핸들러 연결 경로(App → WorkspaceSection → OperationalTabs) 확인.
5. 수정 없이도 재현 가능한 최소 실패 시나리오 3개 이상 문서화.

## 5) 현재 판정

1. `상태`: 검증 준비 완료, 수정 미실행.
2. `즉시 착수 권고`: P0 두 건의 스코프 정합화 설계 검증.
3. `보류`: 코드 반영 및 배포 관련 모든 작업.
