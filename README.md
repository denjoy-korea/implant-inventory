# Implant Inventory

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
- `VITE_TOSS_CLIENT_KEY` (TossPayments 공개 키 — VITE_ 접두어 허용)

선택값:
- `GEMINI_API_KEY`

**보안 정책**: 암호화 키는 클라이언트(`VITE_`) 금지, Supabase Edge Function secret만 사용.

민감 시크릿(환자 데이터 암호화 키, 결제 시크릿 등)은 **클라이언트 env가 아닌 Supabase Edge Function secret**으로 관리합니다:
```bash
supabase secrets set PATIENT_DATA_KEY=$(openssl rand -base64 32)
supabase secrets set TOSS_SECRET_KEY=your-toss-secret-key
```

## Quality Gates
```bash
npm run typecheck
npm run test
npm run build
```

릴리즈 전 권장:
```bash
npm run verify:premerge
npm run verify:release
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
