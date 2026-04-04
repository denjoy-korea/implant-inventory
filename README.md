# DenJOY Platform

치과 임플란트 재고/수술기록/주문 관리를 위한 React + Supabase 기반 웹앱입니다.

## Tech Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Supabase (Postgres/Auth/Storage/Edge Functions)

## Local Setup
1. 의존성 설치
```bash
npm install
```
2. 환경변수 파일 생성
```bash
cp .env.example .env.local
```
3. 개발 서버 실행
```bash
npm run dev
```

## Environment Variables
필수값은 `.env.example`을 기준으로 설정합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TOSS_CLIENT_KEY` (권장: TossPayments 공개 키)
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` (레거시 호환용, 현재도 허용)

선택값:
- `GEMINI_API_KEY`

**보안 정책**: 암호화 키는 클라이언트(`VITE_`) 금지, Supabase Edge Function secret만 사용.

민감 시크릿(환자 데이터 암호화 키, 결제 시크릿 등)은 **클라이언트 env가 아닌 Supabase Edge Function secret**으로 관리합니다:
```bash
supabase secrets set PATIENT_DATA_KEY=$(openssl rand -base64 32)
supabase secrets set TOSS_SECRET_KEY=your-toss-secret-key
```

`.env.local` 변경 후에는 `npm run dev` 또는 `vite preview` 서버를 반드시 재시작해야 합니다.

## Quality Gates
```bash
npm run smoke:architecture
npm run typecheck
npm run test
npm run test:unit
npm run build
npm run smoke:bundles
```

릴리즈 전 권장:
```bash
npm run verify:premerge
npm run verify:release
```

## Architecture Baseline
현재 앱은 공개 브랜드/솔루션 셸, 병원 운영 대시보드, 시스템 관리자 콘솔, 강의/콘텐츠 허브가 함께 있는 멀티서비스 확장 브랜치입니다. 확장 전에 충돌면을 줄이기 위해 아래 경계를 기준선으로 고정합니다.

- `App.tsx` / `components/app/AppShellFrame.tsx`: 최상위 셸 조립 전용
- `hooks/useAppLogic.tsx`: 얇은 상위 오케스트레이터
- `hooks/useAppDashboardCoordinator.ts`: 대시보드 상위 조합자
- `hooks/useAppDashboardDataOps.ts`: 대시보드 데이터 플로우 조합자
- `hooks/useAppDashboardInventoryOps.ts`: 주문/반품/재고 동기화
- `hooks/useAppDashboardFixtureFlow.ts`: fixture/온보딩/비교 플로우
- `hooks/useAppSessionLifecycle.ts`: 세션 오케스트레이션
- `hooks/useAppSessionLifecycleActions.ts`: 로그인 성공/회원 탈퇴 액션
- `hooks/useAppHospitalDataLoader.ts`: 병원 데이터 로드 오케스트레이션
- `components/app/PublicAppShell.tsx`: 공개 셸 조합자
- `hooks/usePublicShellNavigation.ts`: 공개 셸 네비게이션
- `hooks/usePublicShellSurface.ts`: 공개 셸 plan/meta/surface 조립

머지 전에 구조 드리프트를 빠르게 잡으려면 아래 순서를 유지합니다.

```bash
npm run smoke:auto
npm run lint
npm run test
npm run test:unit
npm run build
npm run smoke:bundles
```

## Bundle Budgets
번들 회귀는 `dist/assets` 기준으로 숫자로 차단합니다.

- `index-*.js`: 325 KiB 이하
- `SystemAdminDashboard-*.js`: 320 KiB 이하
- `OrderManager-*.js`: 230 KiB 이하
- `InventoryManager-*.js`: 225 KiB 이하
- `PublicAppShell-*.js`: 50 KiB 이하
- `PublicSolutionRouteSection-*.js`: 12 KiB 이하
- `xlsx-vendor-*.js`: 440 KiB 이하

검사 명령:
```bash
npm run smoke:bundles
```

## Deployment
Vercel 프로덕션 배포:
```bash
vercel --prod
```

## Supabase Migration Policy
마이그레이션 단일 기준은 아래 문서를 따릅니다.

- `docs/04-report/supabase-migration-source-of-truth.md`

요약:
- 운영 기준 SQL: `supabase/*.sql`
- `supabase/supabase/migrations/*`는 과거/CLI 산출물로 취급 (신규 추가 금지)

## Related Docs
- 운영 점검: `docs/04-report/security-smoke-test-checklist.md`
- 암호화 마이그레이션 런북: `docs/04-report/patient-encryption-migration-runbook.md`
- 플랫폼 하드닝 기준: `docs/04-report/features/platform-runtime-hardening.report.md`

## Dentweb Auto Upload (Edge Function)
`dentweb-auto`에서 생성한 엑셀을 서버로 자동 수집하려면 `dentweb-upload` Edge Function을 사용합니다.

1. 함수 배포
```bash
supabase functions deploy dentweb-upload --no-verify-jwt
supabase functions deploy dentweb-automation
```

2. 시크릿 설정
```bash
supabase secrets set DENTWEB_UPLOAD_TOKEN=your-strong-token
supabase secrets set PATIENT_DATA_KEY=your-patient-data-key
```

멀티 병원(권장): 병원별 토큰 매핑
```bash
supabase secrets set DENTWEB_UPLOAD_TOKEN_MAP='{
  "token-for-hospital-a":"35e35c91-4ec2-4b3b-8975-089907784497",
  "token-for-hospital-b":"5a9a3d30-cca8-4e5a-8637-6b2e026089db"
}'
```

3. 업로드 URL
```text
https://<project-ref>.supabase.co/functions/v1/dentweb-upload
```

4. 요청 형식 (`multipart/form-data`)
- `Authorization: Bearer <DENTWEB_UPLOAD_TOKEN>`
- `hospital_id`: UUID (`DENTWEB_UPLOAD_TOKEN_MAP` 사용 시 생략 가능)
- `file`: `.xlsx`/`.xls`

## Dentweb Agent Control (Interval + Run Now)
앱에서 간격 자동 실행/즉시 실행을 제어하려면 `dentweb-automation` Edge Function을 사용합니다.

- 인증: Supabase 회원 JWT
- `claim_run`: 에이전트가 실행 여부 폴링
- `request_run`: 앱에서 "지금 실행 요청"
- `report_run`: 에이전트 실행 결과 보고
