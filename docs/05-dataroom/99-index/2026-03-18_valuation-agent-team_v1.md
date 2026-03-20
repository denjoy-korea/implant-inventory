# 프로젝트 전반 분석 및 가치평가 에이전트 팀 구성안 (v1)

> 작성일: 2026-03-18
> 대상 프로젝트: `implant-inventory` / DenJOY
> 목적: 제품, 기술, 상업성, 보안, 증빙 신뢰도를 동시에 검토해 현재 시점의 공정가치 범위를 좁힌다.

## 1. 현재 프로젝트 스냅샷

- 제품 성격: 치과 임플란트 재고, 수술기록, 발주, 교환/반품, 멤버 권한, 결제, 문의, 자동화 에이전트를 포함한 수직형 SaaS
- 핵심 스택: React 19 + TypeScript + Vite + Supabase + Vercel
- 자동화 자산: Dentweb 연동 Python 에이전트 + Supabase Edge Function 27개
- 코드 표면적: TS/TSX/MJS/SQL/PY 합계 약 693개 파일, `components` 289개 파일, SQL 197개 파일, 스크립트 테스트 10개
- 증빙 자산: 데이터룸 구조, 보안 운영 로그, 릴리즈 게이트 로그, 트래픽 KPI 스냅샷 스크립트, MRR raw 점검 스크립트 존재
- 상업 단계: 실결제 전환 전, 활성 유료 계약 0건, 수금 0건

## 2. 즉시 반영할 전제

이 프로젝트는 아직 `revenue multiple` 중심 밸류에이션을 적용하기 이르다. 현재 평가는 아래 3축으로 해야 한다.

1. 제품/기술 축: 실제 병원 업무 흐름에 얼마나 깊게 박혀 있는가
2. 운영/증빙 축: 보안, 정책, 결제, 로그, 데이터룸이 투자 검토를 견딜 만큼 정리되어 있는가
3. 상업화 축: 실결제 전환과 초기 유입 증대 후 얼마나 빠르게 MRR 증빙으로 전환 가능한가

## 3. 즉시 플래그할 이슈

1. `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md`의 Basic/Plus 가격이 `types/plan.ts` 및 `docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md`와 불일치한다.
2. `docs/05-dataroom/99-index/dataroom-checklist.md` 기준으로 `MRR 계산식과 원장(raw) 일치 검증`은 아직 `blocked` 상태다.
3. `docs/05-dataroom/99-index/2026-03-05_plan-gap-analysis_v1.md` 기준 최근 30일 유효 세션이 97로, 목표 300+에 못 미친다.
4. 실결제 전환 전이라 현재 밸류에이션은 매출 검증보다 제품 완성도와 상업화 준비도 비중이 더 커야 한다.

## 4. 권장 에이전트 팀

### A. Chief Analyst / Orchestrator
- 역할: 전체 워크스트림을 묶고 최종 투자 메모의 한 문장 결론을 만든다.
- 주요 입력: 아래 모든 에이전트 산출물, 데이터룸 인덱스, PDCA 보고서
- 주요 출력: `bear / base / bull` 3단 밸류에이션 메모, 핵심 리스크 5개, 즉시 보정 항목 우선순위
- 성공 기준: 기술팀 관점과 투자자 관점의 서술이 충돌하지 않음

### B. Product Workflow Analyst
- 역할: 이 제품이 치과 현장의 어떤 고통을 줄이고, 대체재 대비 어떤 워크플로우 락인을 만드는지 검증한다.
- 집중 범위: 재고, 수술기록, 발주, 교환/반품, 멤버 권한, 자동화 업로드
- 주요 입력: `App.tsx`, `components/`, `dentweb-auto/README.md`, 플랜 정의
- 주요 출력: 핵심 업무흐름 맵, 플랜별 가치 사다리, PMF 가설 검증 메모
- 성공 기준: “왜 이 제품이 일반 재고 SaaS가 아니라 vertical SaaS인가”를 설명 가능

### C. Technical Diligence Analyst
- 역할: 코드 구조, 배포 구조, DB/RPC/Edge Function 표면적, 유지보수 난이도, 기술 부채를 정리한다.
- 집중 범위: React 프론트, Supabase SQL/RLS, Edge Functions, Python 자동화 에이전트
- 주요 입력: `README.md`, `supabase/`, `services/`, `hooks/`, `scripts/`
- 주요 출력: 아키텍처 맵, 장애 지점 목록, 버스팩터/운영 복잡도 평가
- 성공 기준: “지금 이 제품은 MVP인지 초기 운영 가능한 제품인지”를 기술적으로 판정

### D. Security / Compliance Auditor
- 역할: 의료·환자 데이터, 결제, 권한, 암호화, 정책/약관, 운영 로그의 신뢰도를 검증한다.
- 집중 범위: RLS, 환자정보 암호화, 결제 callback, 계정 삭제/보존, 정책 버전
- 주요 입력: `supabase/*.sql`, `supabase/migrations/`, `docs/05-dataroom/04-security-operations/`, `docs/05-dataroom/05-policy-versioning/`
- 주요 출력: 컴플라이언스 리스크 레지스터, 보안 증빙 신뢰도 점수, 투자자 질문 예상 목록
- 성공 기준: “실사에서 바로 깨질 문장”을 사전에 제거

### E. Revenue Readiness Analyst
- 역할: 현재 매출은 없어도, 결제 파이프라인과 요금정책, 계약 체계, 환불 규칙이 언제 매출증빙으로 전환 가능한지 본다.
- 집중 범위: `billing_history`, Toss 연동, trial, plan pricing, MRR unblock 상태
- 주요 입력: `types/plan.ts`, 결제/환불 Edge Functions, `docs/05-dataroom/01~03`, `scripts/mrr-raw-unblock-check.mjs`
- 주요 출력: 매출 전환 준비도 점수, 결제 cutover 체크리스트, 단위경제 가정표
- 성공 기준: “실결제 전환 후 2주 내 어떤 숫자부터 신뢰할 수 있는가”를 답할 수 있음

### F. Growth / Funnel Analyst
- 역할: 유입, 전환, 체험, 문의, 결제 모달, 세션 품질을 점검해 초기 성장성 증거의 질을 판단한다.
- 집중 범위: `page_views`, traffic snapshot, waitlist/contact, payment funnel
- 주요 입력: `scripts/admin-traffic-snapshot.mjs`, `scripts/funnel-kpi-utils.mjs`, `services/pageViewService.ts`, `contact_inquiries`
- 주요 출력: 퍼널 무결성 보고서, 표본 부족 보정 설명, 향후 30일 실험 설계
- 성공 기준: 숫자가 작더라도 왜곡 없이 읽을 수 있는지 증명

### G. Market / Moat Analyst
- 역할: 이 제품의 경쟁우위가 단순 기능 수가 아니라 도메인 적합성, 전환비용, 데이터 축적, 연동 난이도에서 나오는지 분석한다.
- 집중 범위: 덴트웹 자동화, 임플란트 특화 분석, 병원 운영 플로우, 협업/권한, 거래처/자동 발주 로드맵
- 주요 입력: 플랜 문서, UI 기능 목록, 자동화 문서, 운영 보고서
- 주요 출력: 경쟁 포지셔닝 메모, 방어력 항목, 약한 해자와 강한 해자 구분
- 성공 기준: 밸류에이션에서 “왜 지금은 작아도 무시하기 어려운가”를 구조적으로 설명

### H. Valuation Synthesizer
- 역할: 위 결과를 종합해 현 시점 공정가치 접근법을 선택한다.
- 권장 방식:
  - 1차: replacement cost + build complexity + diligence readiness
  - 2차: stage-adjusted scorecard
  - 3차: go-live 이후 30~90일 시나리오 기반 forward revenue option value
- 주요 출력: 보수/기준/공격 3구간 가치 범위, 각 구간의 전제조건
- 성공 기준: “지금 왜 이 값이고, 어떤 지표가 나오면 상향되는가”가 명확함

## 5. 팀 운영 순서

1. `Chief Analyst`가 기준 문서와 source-of-truth 목록을 고정한다.
2. `Product Workflow Analyst`와 `Technical Diligence Analyst`가 병렬로 제품 실체를 판정한다.
3. `Security / Compliance Auditor`와 `Revenue Readiness Analyst`가 실사 리스크를 판정한다.
4. `Growth / Funnel Analyst`가 초기 숫자의 신뢰도와 표본 한계를 정리한다.
5. `Market / Moat Analyst`가 경쟁우위 설명을 압축한다.
6. `Valuation Synthesizer`가 최종 범위를 작성하고, `Chief Analyst`가 투자자용 문장으로 재구성한다.

## 6. 각 에이전트 공통 산출물 포맷

각 에이전트는 아래 5개 항목으로만 보고한다.

1. 현재 판정: `strong` / `mixed` / `weak`
2. 근거 3개: 코드 또는 문서 경로 기준
3. 밸류에이션 영향: 상향 / 중립 / 하향
4. 즉시 수정 3개
5. 미해결 질문 3개

## 7. 최종 밸류에이션 판단 로직

### 지금 기준으로 높은 가중치를 둘 항목
- 제품 워크플로우 깊이
- Dentweb 자동화 기반의 도메인 특화성
- Supabase + Edge Function + RLS 기반 운영 가능성
- 보안/정책/데이터룸 증빙 정리 수준

### 지금 기준으로 낮게 보되 반드시 추적할 항목
- 실매출
- 실결제 전환율
- 코호트 리텐션
- 환불률

### 현재 단계에서 밸류에이션 상단을 막는 항목
- 실결제 미전환
- 유효 세션 부족
- 일부 투자자 문서와 코드 기준의 불일치

## 8. 실행 우선순위

1. Source-of-truth 정리: 가격, 플랜, 약관, 환불, trial, billing 필드 기준 단일화
2. Investor pack 정합성 재검수: 특히 가격 표, 플랜 설명, live/test 상태
3. 결제 live cutover 준비도 점검
4. 퍼널 유입 분모 확대와 30일 스냅샷 누적
5. 그 다음에야 상향 밸류에이션 논리 강화

## 9. 추천 결론

지금 이 프로젝트에는 8명 전원 상시 투입보다, 아래 5명 코어 팀과 3명 보조 팀 구조가 적합하다.

- 코어: `Chief Analyst`, `Product Workflow Analyst`, `Technical Diligence Analyst`, `Revenue Readiness Analyst`, `Valuation Synthesizer`
- 보조: `Security / Compliance Auditor`, `Growth / Funnel Analyst`, `Market / Moat Analyst`

이유는 현재 가장 큰 불확실성이 “기술 구현 가능성”보다 “실결제 전환 직전 단계의 상업성 증빙 부족과 문서 정합성”에 있기 때문이다.
