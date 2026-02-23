# Legal/UX KPI Monitoring Runbook

작성일: 2026-02-23
대상 기간: 배포 후 14일

## 1) 목적
- 법적 문구/동의 UX 개선 이후 실제 전환 성과를 동일 기준으로 추적한다.
- 퍼널 병목(가입, 결제 요청, 대기신청, 모바일 이탈)을 빠르게 발견한다.

## 2) 수집 이벤트 (필수)
- `landing_view`
- `auth_start`
- `auth_complete`
- `pricing_plan_select`
- `pricing_payment_modal_open`
- `pricing_payment_request_start`
- `pricing_payment_request_success`
- `pricing_payment_request_error`
- `pricing_waitlist_modal_open`
- `waitlist_submit`
- `contact_submit`

## 3) KPI 정의
| KPI | 계산식 (세션 기준) | 소스 |
|---|---|---|
| 랜딩 → 회원가입 전환율 | `auth_start / landing_view * 100` | `scripts/funnel-kpi-utils.mjs` |
| 결제 모달 완료율 | `pricing_payment_request_success / pricing_payment_modal_open * 100` | `scripts/funnel-kpi-utils.mjs` |
| 대기신청 완료율 | `waitlist_submit / pricing_waitlist_modal_open * 100` | `scripts/funnel-kpi-utils.mjs` |
| 모바일 이탈률 | `100 - (mobileEngagedSessions / mobileLandingSessions * 100)` | `scripts/funnel-kpi-utils.mjs` |

모바일 세션 판별 기준:
- `page_views.event_data.is_mobile === true`
- `pageViewService`가 페이지뷰/이벤트에 `is_mobile`을 자동 기록

## 4) 실행 절차
1. 회귀 테스트
```bash
npm run test:legalux
npm run test:funnel
node --test scripts/mobile-critical-flow.test.mjs
```

2. KPI 스냅샷 생성 (14일)
```bash
set -a; source .env.local; set +a
node scripts/admin-traffic-snapshot.mjs 14
```

사전 조건:
- `.env.local` 또는 환경변수에 아래 값 필요
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

3. 산출물 확인
- 생성 파일: `docs/04-report/traffic-kpi-snapshot-YYYY-MM-DD.md`
- 확인 항목:
  - 이벤트 퍼널 step CVR
  - 결제 요청 성공/실패 세션
  - 모바일 이탈률

## 5) 운영 판단 기준 (권장)
- 랜딩 → 회원가입 전환율: 20% 미만이면 Hero/CTA 카피 재점검
- 결제 모달 완료율: 40% 미만이면 결제 안내/동의 UX 간소화 점검
- 대기신청 완료율: 60% 미만이면 모달 필드/문구 부담도 점검
- 모바일 이탈률: 70% 초과면 모바일 대체 CTA 동선 재검토
