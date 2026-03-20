# DenJOY 1차 실사·가치평가 보고서 (v1)

> 작성일: 2026-03-18
> 기준 저장소: `implant-inventory`
> 평가 성격: 내부 1차 실사 메모
> 주의: 본 문서는 외부 비교기업 멀티플 또는 제3자 공정가치 의견서가 아니라, 현재 코드/문서/운영증빙 기준의 내부 평가다.

## 1. 한 줄 결론

DenJOY는 **제품 깊이와 기술 구현도는 강한 편**이지만, **실결제 미전환과 초기 상업 지표 부족** 때문에 현재 시점의 가치는 `제품 완성도 기반의 초기 기업가치`로 봐야 한다.

## 2. 총평

### 최종 판정

- 제품 실체: `strong`
- 기술 실사: `strong`
- 보안/컴플라이언스: `mixed-strong`
- 매출화 준비도: `mixed`
- 성장/퍼널 증거: `weak`
- 문서/증빙 신뢰도: `mixed`

### 현재 판단

1. 이 프로젝트는 단순 데모가 아니라, 재고·수술기록·발주·교환/반품·권한·결제·문의·자동화 업로드를 포괄하는 초기 운영형 vertical SaaS에 가깝다.
2. 다만 2026년 3월 18일 기준 실결제 매출 증빙이 없어 `revenue multiple` 중심 평가는 시기상조다.
3. 따라서 현재 가치는 `replacement cost + workflow depth + go-live readiness - commercialization discount` 방식으로 보는 것이 합리적이다.

## 3. 평가 범위와 근거

### 주요 근거 문서

1. 제품/기술 개요: `README.md`, `App.tsx`, `components/`, `types/plan.ts`, `dentweb-auto/README.md`
2. 상업/법무/보안 증빙: `docs/05-dataroom/`
3. 퍼널/트래픽: `scripts/admin-traffic-snapshot.mjs`, `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-2026-03-05.md`, `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-2026-03-16.md`
4. 결제/MRR: `supabase/011_billing_history.sql`, `docs/04-report/payment-live-cutover-runbook-2026-03-06.md`, `docs/05-dataroom/02-billing-reconciliation/mrr-raw-unblock-check-2026-03-06.md`
5. 보안 운영: `docs/05-dataroom/04-security-operations/2026-03-05_security-operations-evidence-refresh_v1.md`, `docs/05-dataroom/04-security-operations/verify-premerge-log-2026-03-05.md`

### 2026-03-18 로컬 검증

- `npm run typecheck`: PASS
- `npm run test`: PASS (`138/138`)
- `npm run build`: PASS

## 4. 강점

### 4.1 제품 워크플로우 깊이

- `App.tsx`와 `components/` 구조상 공개 유입, 인증, 온보딩, 대시보드, 주문, 재고실사, 권한관리, 결제, 지원 채팅까지 한 흐름으로 연결돼 있다.
- `types/plan.ts` 기준 플랜 게이팅이 기능 단위로 세분화돼 있어 상업화 설계가 이미 제품 내부에 녹아 있다.
- `dentweb-auto/README.md`와 `agent/` 및 `supabase/functions/dentweb-*` 계열을 보면, 외부 치과 업무 시스템과의 실제 운영 연동이 구현돼 있다.

### 4.2 기술 구현도와 운영 가능성

- Supabase 기반으로 Auth, DB, RLS, Edge Functions, Storage, 결제 callback, 문의 접수, 알림까지 일관된 백엔드 표면을 갖췄다.
- 저장소 기준 TS/TSX/MJS/SQL/PY 파일 약 693개, `components` 289개, SQL 197개, Edge Function 27개로 초기 제품치고 구현 범위가 넓다.
- 2026-03-18 기준 로컬 `typecheck/test/build`가 모두 통과해 현재 브랜치의 기본 기술 건전성은 양호하다.

### 4.3 보안/증빙 체계

- `docs/05-dataroom/04-security-operations/2026-03-05_security-operations-evidence-refresh_v1.md` 기준 보안 운영 증빙은 2026-03-05 시점 최신화가 완료돼 있다.
- `verify-premerge-log-2026-03-05.md` 기준 `verify:premerge` 5회 연속 GREEN, `verify:release` 1회 GREEN 이력이 존재한다.
- 환자정보 암호화, RLS 하드닝, 결제/권한 관련 마이그레이션과 테스트가 광범위하게 존재한다.

## 5. 가치 훼손 요인

### 5.1 실매출 부재

- `docs/05-dataroom/01-contracts/contract-list.md` 기준 2026-03-05 현재 활성 유료 계약은 0건이다.
- `docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md` 기준 청구/수금/환불은 모두 0원이다.
- `docs/05-dataroom/02-billing-reconciliation/mrr-raw-unblock-check-2026-03-06.md` 기준 `paid_non_zero_live=0`, 상태는 `BLOCKED`다.

### 5.2 결제 전환 미완료

- `docs/04-report/payment-live-cutover-runbook-2026-03-06.md` 기준 live 전환 절차는 정리돼 있지만, 실제 전환은 아직 완료되지 않았다.
- 같은 문서와 `dataroom-checklist.md`를 보면 `is_test_payment` 원격 migration 미반영이 남아 있다.
- 따라서 결제 파이프라인은 “구현 완료”에 가깝지만, “실매출 검증 완료” 상태는 아니다.

### 5.3 성장 증거 부족

- `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-2026-03-05.md` 기준 최근 30일 고유 세션은 97이었다.
- 최신 `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-2026-03-16.md` 기준 최근 30일 고유 세션은 50이다.
- 2026년 3월 16일 기준 로그인 전환 세션 0, 결제 모달 오픈 0, 문의/웨이트리스트 제출 0으로, 상업 지표는 아직 매우 초기다.

### 5.4 문서 정합성 리스크

- `types/plan.ts`와 `docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md` 기준 Basic/Plus 가격은 각각 27,000원 / 59,000원이다.
- ~~하지만 `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md`에는 29,000원 / 69,000원으로 기재돼 있다.~~ → **정정 완료 (2026-03-18)**: 27,000원 / 59,000원으로 수정됨.
- ~~더 나아가 `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_legal-finance-review-round_v1.md`는 가격 정합성을 `PASS`로 기록하고 있어, 투자자 패키지의 신뢰도를 일부 깎는다.~~ → **정정 완료 (2026-03-18)**: 재검증 이력 추가, 투자자 패키지 전체 가격 정합성 확보.

## 6. 에이전트별 판정

### Product Workflow Analyst

- 판정: `strong`
- 근거:
  - `App.tsx`의 공개/대시보드/관리자 분기 구조
  - `components/` 전반의 업무 전용 화면 범위
  - `dentweb-auto/README.md`의 실무 자동화 시나리오
- 밸류 영향: 상향
- 즉시 수정:
  - 핵심 업무흐름 3개를 투자자용 한 페이지로 압축
  - 병원 사용자 역할별 ROI 시나리오 명문화
  - 수술기록 자동업로드의 운영 사례 정리

### Technical Diligence Analyst

- 판정: `strong`
- 근거:
  - React + Supabase + Edge Functions + Python agent의 다층 아키텍처
  - 2026-03-18 로컬 `typecheck/test/build` PASS
  - `scripts/` 및 SQL 마이그레이션 테스트 자산 존재
- 밸류 영향: 상향
- 즉시 수정:
  - 아키텍처 다이어그램 1장 작성
  - 핵심 장애지점 5개와 복구절차 문서화
  - 운영 의존 시크릿/cron/함수 목록 표준화

### Security / Compliance Auditor

- 판정: `mixed-strong`
- 근거:
  - 보안 운영 증빙 최신화 완료
  - RLS/암호화/계정삭제 관련 SQL 및 테스트 자산 풍부
  - 투자자 문서 정합성 리스크 존재
- 밸류 영향: 상향과 하향 혼재
- 즉시 수정:
  - investor pack 가격표 수정
  - policy/version/source-of-truth 맵 추가
  - live/test 결제 상태 설명 문구 통일

### Revenue Readiness Analyst

- 판정: `mixed`
- 근거:
  - `billing_history` 스키마와 Toss 연동 구현 완료
  - live cutover runbook 존재
  - 실제 live paid row 부재
- 밸류 영향: 하향
- 즉시 수정:
  - live 결제 전환
  - `is_test_payment` 원격 migration 반영
  - 첫 실결제 1~3건 기준 대사 루프 검증

### Growth / Funnel Analyst

- 판정: `weak`
- 근거:
  - 2026-03-05 최근 30일 고유 세션 97
  - 2026-03-16 최근 30일 고유 세션 50
  - session_id 누락은 0이지만 분모가 작고 상위 전환지표가 사실상 비어 있음
- 밸류 영향: 하향
- 즉시 수정:
  - 유입 채널 2개 이상 운영
  - pricing/contact/waitlist CTA 실험 재개
  - 30일 유효 세션 300+ 회복

### Market / Moat Analyst

- 판정: `mixed-strong`
- 근거:
  - Dentweb 연동 자동화
  - 임플란트 수술·재고·교환 분석의 수직 특화 기능
  - 역할관리, 권한, 거래처/발주 고도화 로드맵 존재
- 밸류 영향: 상향
- 즉시 수정:
  - 대체재 대비 차별표 작성
  - “왜 일반 재고 SaaS가 아닌가” 메시지 정리
  - 자동화 도입 후 절감시간 가설 정량화

## 7. 1차 가치평가

### 7.1 평가 방식

현재는 다음 세 가지를 조합해 봐야 한다.

1. `replacement cost floor`
2. `workflow depth premium`
3. `commercialization discount`

### 7.2 내부 추정 범위

아래 수치는 **외부 비교기업 멀티플 없이**, 현재 저장소와 증빙 상태만 보고 추정한 내부 가설 범위다.

- 보수적 하단: **8억 ~ 12억 원**
  - 전제: 실결제 전환 지연, 퍼널 분모 정체, 문서 정합성 보정 지연
- 기준 범위: **12억 ~ 20억 원**
  - 전제: 현재 제품 완성도와 기술 구현도는 인정하되, 아직 매출 증명 전 단계로 할인 적용
- 상향 범위: **20억 ~ 35억 원**
  - 전제: 2026년 4월 내 실결제 전환, 첫 paid row 검증, 유효 세션 300+, 초기 문의/체험/결제 전환 지표 확보

### 7.3 현재 채택 의견

현 시점 채택 의견은 **12억 ~ 20억 원**이 가장 방어적이다.

이 판단은 다음 해석에 기반한다.

1. 제품이 이미 넓은 도메인 범위를 커버하므로 단순 MVP 할인만 주기 어렵다.
2. 그러나 유료 고객 0건, live 결제 0건, 2026년 3월 16일 기준 최근 30일 고유 세션 50은 상단 밸류를 정당화하지 못한다.
3. 즉, 현재 가치는 “실행된 제품 자산의 가치”는 인정하지만 “검증된 상업 가치”는 아직 크게 인정하지 않는 구간이다.

## 8. 30일 내 밸류 상향 트리거

1. `is_test_payment=false` 기준 첫 실결제 1건 이상 발생
2. `mrr-raw-unblock-check`가 `BLOCKED`에서 해제
3. 최근 30일 고유 세션 300+ 회복
4. 문의 또는 waitlist 제출 전환 발생
5. investor pack 가격/정책/플랜 표기와 코드 기준 완전 일치

## 9. 즉시 실행 권고

1. `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md` 가격표부터 수정
2. `is_test_payment` 원격 migration과 결제 live cutover를 같은 주 안에 묶어서 완료
3. `docs/04-report/traffic-kpi-daily/` 기반으로 최근 14일 퍼널 악화 원인 점검
4. 첫 실결제 이후 `billing-reconciliation-2026-03.md`와 `mrr-raw-unblock-check`를 즉시 갱신
5. 투자자용 설명은 당분간 “pre-revenue but product-deep vertical SaaS” 톤으로 고정

## 10. 결론

DenJOY는 2026년 3월 18일 기준, **기술과 제품은 기대 이상으로 앞서 있지만 상업적 검증은 아직 시작 전인 자산**이다.

따라서 지금 단계의 핵심은 기능 추가가 아니라 아래 세 가지다.

1. 실결제 전환
2. 퍼널 분모 확대
3. 투자자 패키지 정합성 복구

이 세 가지가 해결되면, 현재의 1차 기준 범위인 **12억~20억 원**은 상향 재평가 여지가 충분하다.
