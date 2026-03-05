# MRR Raw Unblock Plan (2026-03-05)

## 배경

현재 데이터룸 체크리스트의 `MRR 계산식과 원장(raw) 일치 검증` 항목은 실결제 레코드 부재로 `BLOCKED` 상태다.

## 블로커 조건

1. `billing_history`에 테스트 모드가 아닌 실결제 레코드가 생성되어야 함
2. PG 정산 원장(일자/거래ID/실수금)이 수집 가능해야 함

## 해제 체크리스트

| 순번 | 체크 항목 | 완료 기준 |
| --- | --- | --- |
| 1 | 실결제 1건 이상 발생 확인 | `billing_history`에 실결제 월 레코드 존재 |
| 2 | PG 원장 CSV 확보 | 거래ID/승인금액/정산금액 컬럼 포함 |
| 3 | 내부 대사 SQL 실행 | 월 기준 `청구합=수금합-환불합` 확인 |
| 4 | 데이터룸 반영 | 체크리스트 `blocked -> done` 전환 + 근거 링크 첨부 |

## 검증 SQL 초안

```sql
-- 월별 청구/수금/환불 요약
select
  date_trunc('month', created_at) as month,
  sum(case when status = 'charged' then amount else 0 end) as charged_amount,
  sum(case when status = 'paid' then amount else 0 end) as paid_amount,
  sum(case when status = 'refunded' then amount else 0 end) as refunded_amount
from billing_history
group by 1
order by 1 desc;
```

## 담당/재확인 일정

- 담당: Finance Owner + BizOps
- 재확인: 2026-03-12 주간 운영 점검 회의

## 실행 명령

```bash
npm run report:mrr:unblock-check
```

- 산출물: `docs/05-dataroom/02-billing-reconciliation/mrr-raw-unblock-check-YYYY-MM-DD.md`
- 판정 기준:
  - `READY`: paid 레코드 1건 이상 (raw 대사 단계 진행)
  - `BLOCKED`: paid 레코드 0건 (현 상태 유지)
