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
- `VITE_PATIENT_DATA_KEY` (클라이언트 번들 노출 특성 주의)

선택값:
- `GEMINI_API_KEY`

결제 웹훅 URL(`MAKE_WEBHOOK_URL`) 등 민감값은 **클라이언트 env가 아니라 Supabase Edge Function secret**으로 관리합니다.

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
