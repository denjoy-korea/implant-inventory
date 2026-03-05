# Git Hooks

## Setup

```bash
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Hooks

### pre-commit
Supabase migration 타임스탬프 중복 검출. 동일 타임스탬프 파일이 2개 이상이면 커밋을 차단합니다.

배경: Supabase CLI는 `schema_migrations.version`에 UNIQUE 제약이 있어 같은 타임스탬프의 두 번째 마이그레이션을 무시합니다. 이로 인해 프로덕션 스키마가 불완전해질 수 있습니다.
