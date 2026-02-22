# 전환/수익화 구조 객관 평가 보고서 (2026-02-22)

## 1) 결론 요약
- 현재 구조는 **"8.1/10 평가는 과대도 과소도 아닌 수준"**으로 판단됩니다.
- 코드 기준 재평가 점수는 **8.0/10**입니다.
- 강점은 `실수집 전환 경로 복구`와 `오류 재시도 UX`이며, 감점 요인은 `품절 대안 약함`, `결제 실패 후 대체 동선 부족`, `강한 CTA 동시 노출`입니다.

## 2) 평가 근거 (Positive)
- Contact 실수집 + 실패 메시지 세분화 반영:
  - `components/ContactPage.tsx:35`
  - `services/contactService.ts:138`
  - `supabase/functions/submit-contact/index.ts:129`
- Analyze 오류 분류/재시도 UX:
  - `components/AnalyzePage.tsx:202`
  - `components/AnalyzePage.tsx:218`
  - `components/AnalyzePage.tsx:1277`
- Pricing 품절 → 대기신청 전환:
  - `components/PricingPage.tsx:802`
  - `components/pricing/PricingWaitlistModal.tsx:31`
- Signup 초기 trial 분기 연결:
  - `components/AuthForm.tsx:96`
  - `components/AuthForm.tsx:463`
  - `App.tsx:2737`

## 3) 피드백 항목 검증

### A. 품절 분기의 대안 제시 약함 (유효)
- 품절 카드에서 1차 액션이 대기신청 단일 경로에 치우쳐 있음.
  - `components/PricingPage.tsx:802`
  - `components/PricingPage.tsx:815`
- 대기신청 모달도 대체 액션(다른 플랜 바로 이동, 상담 예약) 없이 제출 중심.
  - `components/pricing/PricingWaitlistModal.tsx:73`
- 판정: **유효 (중요도 High / 전환 영향 중간 이상)**  

### B. 가입/결제 단계 일부 dead-end (부분 유효)
- 결제 요청 실패 시 메시지는 표시되지만, 후속 분기(상담 요청/대체 플랜 제안)가 없음.
  - `components/PricingPage.tsx:409`
  - `App.tsx:2777`
- `onRequestPayment`가 `false`를 반환하면 모달은 유지되지만 다음 추천 행동이 없음(반복 제출 유도).
  - `components/PricingPage.tsx:393`
- 판정: **부분 유효 (중요도 High / 수익화 영향 큼)**  

### C. CTA 우선순위 충돌 (유효)
- Analyze 리드 저장 섹션(Section 5.5) 이후, 동일 페이지 하단에 강한 이중 CTA 재노출.
  - `components/AnalyzePage.tsx:1133`
  - `components/AnalyzePage.tsx:1313`
- Contact 접수 완료 화면에서도 강한 2개 CTA가 연속 배치되어 "다음 1순위 행동"이 분산됨.
  - `components/ContactPage.tsx:148`
  - `components/ContactPage.tsx:163`
- 판정: **유효 (중요도 Medium / 집중도 저하)**  

## 4) 추가로 발견된 신뢰 저해 요소
- 무료 기간 메시지 불일치:
  - Analyze 하단: `1개월 무료` 표기 (`components/AnalyzePage.tsx:1324`)
  - Pricing/Auth 전반: `14일 무료 체험` 표기 (`components/PricingPage.tsx:527`, `components/AuthForm.tsx:383`)
- 판정: **유효 (중요도 Medium / 신뢰도 영향)**  

## 5) 리스크 우선순위
- P0: 결제 실패/품절 경로에서 대체 수익화 액션 부재 (반복 시 이탈 가능성 높음)
- P1: CTA 우선순위 충돌로 다음 행동 분산
- P1: 무료 기간 카피 불일치로 신뢰 손실

## 6) 개선 권고안 (실행 단위)

### 6-1. 품절/결제 실패 경로 보강 (P0)
- 품절 카드 및 대기 모달에 보조 CTA 추가:
  - `다른 플랜 추천받기` (Plan Finder 즉시 오픈)
  - `도입 상담 예약` (Contact로 deep link)
- 결제 실패 시 모달 내 분기 버튼 추가:
  - `상담으로 전환`
  - `계좌이체로 변경`
  - `나중에 다시` (pending 안내 저장)

### 6-2. CTA 우선순위 정리 (P1)
- Analyze:
  - 리드 전송 성공 후 하단 Dual CTA는 1개만 강조하고 나머지는 텍스트 링크로 격하.
- Contact:
  - 접수 완료 후 Primary CTA를 1개만 강조(사용자 의도 기반 분기), Secondary는 링크 스타일로 축소.

### 6-3. 카피 일관성 정리 (P1)
- 무료 기간 표기 단일화 (`14일` 또는 정책 변경 시 전면 교체).

## 7) KPI 제안 (2주 측정)
- 품절 카드 → 대기신청 전환율
- 대기신청 모달 이탈률(열림 대비 제출)
- 결제 모달 실패 후 재시도율 / 상담 전환율
- Analyze 리드 전송 후 Signup 클릭률
- Contact 접수 완료 후 Primary CTA 클릭률
