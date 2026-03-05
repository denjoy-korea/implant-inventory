# 관리자 트래픽 KPI 스냅샷 (30일)

- 생성시각(KST): 2026-03-05T22:00:00.000+09:00
- 스냅샷 기준일(KST): 2026-03-04
- 집계구간 시작(UTC): 2026-02-02T15:00:00.000Z
- 집계구간 종료(UTC): 2026-03-04T15:00:00.000Z
- 원본 row 수: 12166
- 고유 세션 수: 91
- 로그인 전환 세션: 0 (0%)
- session_id 누락 row: 0
- 평균 Time-to-Auth: 6분
- 평균 Time-to-Value: 0분
- 결제 모달 오픈 세션: 0
- 결제 요청 성공 세션: 0
- 결제 요청 실패 세션: 0
- 결제 모달 완료율: 0%
- 모바일 랜딩 세션: 44
- 모바일 후속행동 세션: 5
- 모바일 이탈률(세션): 89%

## 이벤트 퍼널

| Stage | Sessions | Eligible | Step CVR |
|---|---:|---:|---:|
| Landing View | 91 | - | - |
| Pricing View | 10 | 91 | 11% |
| Auth Start | 32 | 10 | 50% |
| Auth Complete | 22 | 32 | 69% |
| Analyze Start | 2 | 22 | 5% |
| Analyze Complete | 1 | 2 | 50% |
| Contact / Waitlist Submit | 0 | 1 | 0% |

- Contact Submit 세션: 0
- Waitlist Submit 세션: 0
- Contact/Waitlist 통합 전환 세션: 0

## Waitlist 퍼널

| Step | Sessions | Drop-off |
|---|---:|---:|
| pricing_waitlist_button_click | 1 | - |
| pricing_waitlist_modal_open | 1 | 0% |
| pricing_waitlist_submit_start | 0 | 100% |
| pricing_waitlist_submit_success | 0 | 100% |

> 주의: session_id가 없는 row는 세션 기반 KPI에서 제외됩니다.
