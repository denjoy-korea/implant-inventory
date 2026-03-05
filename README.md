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
