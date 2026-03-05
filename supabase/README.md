# Supabase SQL 마이그레이션 정책

## 디렉토리 구조

```
supabase/
├── 000-021_*.sql      ← 레거시 (읽기 전용, 동결)
├── _archive/          ← 중복/대체된 파일 보관소
├── migrations/        ← ★ 단일 소스 (모든 신규 마이그레이션)
└── functions/         ← Edge Functions
```

## 규칙

1. **신규 마이그레이션은 `migrations/` 에만 생성**
   - 타임스탬프 형식: `YYYYMMDDHHMMSS_description.sql`
   - 예: `20260306010000_fix_plan_max_items_free.sql`

2. **루트 SQL (000-021)은 동결 상태**
   - 초기 스키마 + 트리거 + RLS + 플랜 정책 등 원본 참고용
   - 수정 금지 — 변경 필요 시 `migrations/`에 새 파일 생성

3. **`_archive/`는 대체된 파일 보관**
   - 단일 소스 정책에 의해 이동된 중복 SQL
   - 참고용으로만 보관, 실행 대상 아님

4. **`000_all_migrations.sql`은 스냅샷**
   - 전체 마이그레이션 통합 파일 (개발 참고용)
   - 프로덕션 적용 순서는 `migrations/` 기준
