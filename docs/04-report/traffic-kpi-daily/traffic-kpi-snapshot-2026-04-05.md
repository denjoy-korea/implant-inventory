# 관리자 트래픽 KPI 스냅샷 (30일)

- 생성시각(KST): 2026-04-05T00:44:10.192+09:00
- 스냅샷 기준일(KST): 2026-04-05
- 집계구간 시작(UTC): 2026-03-05T15:44:02.271Z
- 집계구간 종료(UTC): (현재 시각)
- 원본 row 수: 15063
- 고유 세션 수: 122
- 로그인 전환 세션: 0 (0%)
- session_id 누락 row: 0
- 평균 Time-to-Auth: 227분
- 평균 Time-to-Value: 0분
- 결제 모달 오픈 세션: 1
- 결제 요청 성공 세션: 0
- 결제 요청 실패 세션: 1
- 결제 모달 완료율: 0%
- 모바일 랜딩 세션: 33
- 모바일 후속행동 세션: 10
- 모바일 이탈률(세션): 70%

## 이벤트 퍼널

| Stage | Sessions | Eligible | Step CVR |
|---|---:|---:|---:|
| Landing View | 122 | - | - |
| Pricing View | 15 | 122 | 12% |
| Auth Start | 41 | 15 | 67% |
| Auth Complete | 28 | 41 | 68% |
| Analyze Start | 1 | 28 | 4% |
| Analyze Complete | 1 | 1 | 100% |
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
