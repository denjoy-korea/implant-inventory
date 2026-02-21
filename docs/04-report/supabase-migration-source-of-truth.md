# Supabase Migration Source of Truth

## 목적
현재 레포에는 마이그레이션 SQL이 두 경로에 공존합니다.

- `supabase/*.sql`
- `supabase/supabase/migrations/*.sql`

중복 관리로 인해 누락/순서 불일치 위험이 있어, 운영 기준을 단일화합니다.

## 운영 기준 (Source of Truth)
- **정식 기준 경로**: `supabase/*.sql`
- 파일 번호는 `001_*.sql` ~ `NNN_*.sql` 형태를 유지합니다.
- 신규 마이그레이션은 반드시 `supabase/` 루트에 추가합니다.

## 비기준 경로 취급
- `supabase/supabase/migrations/*.sql`는 과거 Supabase CLI 생성 이력/아카이브로만 취급합니다.
- 해당 경로에는 신규 파일을 추가하지 않습니다.
- 배포/운영 시 해당 경로를 기준으로 적용하지 않습니다.

## 작성 규칙
1. 신규 SQL 파일은 증가 번호로 생성
2. 파일명은 목적이 드러나게 작성
3. idempotent(재실행 안전)하게 작성 (`IF EXISTS/IF NOT EXISTS` 활용)
4. RLS/권한 변경 시 검증 SQL 또는 체크리스트를 함께 기록

## 적용 절차
1. SQL 작성: `supabase/040_example_feature.sql`
2. 로컬/스테이징 검증
3. 운영 적용
4. 적용 결과를 관련 보고 문서에 기록

## 체크리스트
- [ ] 기존 테이블/정책과 충돌 없는지 확인
- [ ] 롤백 전략 또는 대체 복구 SQL 준비
- [ ] RLS 영향 범위 검토
- [ ] 서비스 레이어/타입 정의 동기화

## 정리 TODO
- `.temp`, 중첩 `supabase/supabase/supabase/.temp` 등 임시 산출물은 주기적으로 정리합니다.
- 정리 작업은 배포 안정성 확인 후 별도 PR/커밋으로 분리합니다.
