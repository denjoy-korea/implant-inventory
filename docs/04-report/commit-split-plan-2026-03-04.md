# Commit Split Plan (2026-03-04)

목적: 릴리즈 리스크 제거/정책 정렬/증빙 문서화를 리뷰 가능한 단위로 분리

## Commit A: Release Gate Recovery

설명: 모바일 핵심 동선 테스트 계약을 현재 라우팅 구조와 정렬  
대상 파일:

1. `scripts/mobile-critical-flow.test.mjs`

권장 메시지:

```text
test: align mobile critical flow contract with current dashboard wiring
```

## Commit B: Trial Policy Single Source (14/28)

설명: 기본 14일 + 베타 신청분 28일 규칙을 프론트/어드민/SQL에서 단일화  
대상 파일:

1. `utils/trialPolicy.ts`
2. `utils/betaSignupPolicy.ts`
3. `services/planService.ts`
4. `components/system-admin/systemAdminDomain.ts`
5. `types.ts`
6. `supabase/048_trial_policy_14_28_alignment.sql`
7. `docs/04-report/trial-policy-standard-2026-03-04.md`
8. `docs/04-report/trial-policy-sql-deployment-checklist-2026-03-04.md`

권장 메시지:

```text
feat: unify trial duration policy to 14d default and 28d beta-start window
```

## Commit C: Data Room Packaging

설명: 데이터룸 표준 구조/증빙 수집 템플릿/실행 트래커 배포  
대상 파일:

1. `docs/05-dataroom/README.md`
2. `docs/05-dataroom/evidence-collection-checklist-2026-03-04.md`
3. `docs/05-dataroom/execution-tracker-2026-03-04.md`
4. `docs/05-dataroom/01-contracts/README.md`
5. `docs/05-dataroom/02-billing-reconciliation/README.md`
6. `docs/05-dataroom/03-refund-termination/README.md`
7. `docs/05-dataroom/04-security-operations/README.md`
8. `docs/05-dataroom/05-policy-versioning/README.md`
9. `docs/05-dataroom/06-investor-pack/README.md`
10. `docs/05-dataroom/06-investor-pack/original/.gitkeep`
11. `docs/05-dataroom/06-investor-pack/redacted/.gitkeep`
12. `docs/04-report/raci-owner-assignment-2026-03-04.md`

권장 메시지:

```text
docs: add dataroom structure, evidence checklist, and owner tracker
```

## 실행 순서

1. Commit A
2. Commit B
3. Commit C

## 주의사항

1. 현재 워크트리는 다른 변경이 혼재되어 있으므로 파일 단위 `git add`로 선별한다.
2. `supabase/.temp/`, `supabase/supabase/` 등 비기준 경로는 스테이징하지 않는다.
