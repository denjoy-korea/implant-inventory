# ~~Supabase Migration Source of Truth~~ (SUPERSEDED)

> **SUPERSEDED**: 이 문서는 2026-02-22에 작성된 초기 정책입니다.
> **현행 정책**: [`supabase/README.md`](../../supabase/README.md) (2026-03-06)
>
> 주요 변경: Source of Truth가 `supabase/*.sql` (루트) → `supabase/migrations/` (타임스탬프식)으로 이전됨.
> 이 문서의 내용을 따르지 마세요.

---

아래는 과거 기록 보존용입니다.

## 목적 (구 정책)
현재 레포에는 마이그레이션 SQL이 두 경로에 공존합니다.

- `supabase/*.sql`
- `supabase/supabase/migrations/*.sql`

중복 관리로 인해 누락/순서 불일치 위험이 있어, 운영 기준을 단일화합니다.

## 운영 기준 (구 정책 — 폐기됨)
- ~~**정식 기준 경로**: `supabase/*.sql`~~
- ~~파일 번호는 `001_*.sql` ~ `NNN_*.sql` 형태를 유지합니다.~~
- ~~신규 마이그레이션은 반드시 `supabase/` 루트에 추가합니다.~~

**현행**: `supabase/migrations/` + 타임스탬프 형식 `YYYYMMDDHHMMSS_description.sql`

## 비기준 경로 취급
- `supabase/supabase/migrations/*.sql`는 과거 Supabase CLI 생성 이력/아카이브로만 취급합니다.
- 해당 경로에는 신규 파일을 추가하지 않습니다.
- 배포/운영 시 해당 경로를 기준으로 적용하지 않습니다.

## 작성 규칙 (여전히 유효)
1. ~~신규 SQL 파일은 증가 번호로 생성~~ → 타임스탬프 형식 사용
2. 파일명은 목적이 드러나게 작성
3. idempotent(재실행 안전)하게 작성 (`IF EXISTS/IF NOT EXISTS` 활용)
4. RLS/권한 변경 시 검증 SQL 또는 체크리스트를 함께 기록
