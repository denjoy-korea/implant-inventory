# MRR Raw Unblock Check (2026-03)

- 생성시각(KST): 2026-03-06T01:41:24.174+09:00
- 점검 월: 2026-03
- 조회 구간(UTC): 2026-03-01T00:00:00.000Z ~ 2026-04-01T00:00:00.000Z
- 조회 권한 모드: service_role

## 집계 결과

- charged: 10건 / 3,933,600원
- paid: 1건 / 0원
- paid_non_zero: 0건 / 0원
- paid_non_zero_live: 0건 / 0원
- refunded: 0건 / 0원
- pending: 9건 / 3,933,600원
- failed: 0건 / 0원
- cancelled: 0건 / 0원
- test_payment: 10건 / 3,933,600원
- status 기준: payment_status(pending/completed/failed/cancelled), refunded는 cancelled 프록시 집계
- live 기준: completed + amount>0 + is_test_payment=false
- fetch notice: is_test_payment 컬럼 미적용 환경으로 감지되어 전건 test 결제로 집계함 (migration 적용 필요)

## 판정

- 상태: BLOCKED
- 사유: 실결제(금액>0, 테스트 제외) paid 레코드가 없어 MRR raw 대사 검증을 시작할 수 없음
