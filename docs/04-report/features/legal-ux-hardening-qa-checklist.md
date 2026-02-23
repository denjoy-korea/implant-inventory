# Legal/UX Hardening QA Checklist

작성일: 2026-02-23
최종 점검일: 2026-02-23

## 실행 로그 (자동 검증)
- `npm run test:legalux` → `8 passed / 0 failed`
- `npm run test:funnel` → `4 passed / 0 failed`
- `node --test scripts/mobile-critical-flow.test.mjs` → `12 passed / 0 failed`
- `npm run typecheck` → PASS
- `npm run build` → PASS
- `set -a; source .env.local; set +a; node scripts/admin-traffic-snapshot.mjs 14` → `SUPABASE_SERVICE_ROLE_KEY` 미설정으로 실행 보류

## 1) 핵심 플로우 회귀 점검
- [x] 랜딩 `무료로 시작하기` 클릭 시 `signup` 이동 (정적 회귀 테스트)
- [x] 요금제 카드 선택 시 `pricing_plan_select` 이벤트 발생 (이벤트 계측 정적 회귀 테스트)
- [x] 비로그인 상태에서 체험 시작 모달 동의 후 회원가입 단계 진입 (흐름 연결 정적 회귀 테스트)
- [x] 결제 요청 모달에서 필수 동의 미체크 시 제출 버튼 비활성
- [x] 대기 신청 모달에서 필수 동의 미체크 시 제출 버튼 비활성
- [x] Contact 문의 제출 시 `contact_submit` 이벤트 발생 (이벤트 계측 정적 회귀 테스트)

## 2) 법적 문구 정합성
- [x] 무료체험 기간/데이터 보존/삭제 문구가 `utils/trialPolicy.ts` 상수 기준으로 노출
- [x] 공개 주요 페이지 푸터에서 `이용약관`, `개인정보처리방침` 접근 가능
- [x] 약관 모달에 자동갱신/해지/환불/청약철회/서비스 중단/책임범위/분쟁처리 조항 포함
- [x] 사업자 정보 표기가 단일 소스(`utils/businessInfo.ts`)와 일치

## 3) 접근성 점검 (키보드)
- [x] `PricingPaymentModal` 열기 → Tab 순환 → ESC 닫기 (정적 회귀 테스트: 로직/속성 확인)
- [x] `PricingWaitlistModal` 열기 → Tab 순환 → ESC 닫기 (정적 회귀 테스트: 로직/속성 확인)
- [x] `LegalModal` 열기 → Tab 순환 → ESC 닫기 (정적 회귀 테스트: 로직/속성 확인)
- [x] 모달 닫기 버튼 `aria-label` 확인 (정적 회귀 테스트)

## 4) 모바일 사용성 점검
- [x] Public 모바일 네비가 CTA/폼 하단을 가리지 않음 (`PublicAppShell` 하단 패딩 적용)
- [x] 모바일에서 무료분석 CTA가 문의/가입 대체 동선으로 동작
- [x] 품절 플랜에서 대기 신청 + 도입 상담 대체 행동 제공

## 5) 이벤트 점검
- [x] `pricing_plan_select`
- [x] `waitlist_submit`
- [x] `contact_submit`
- [x] `auth_start`
- [x] `auth_complete`

## 6) 배포 후 2주 KPI 모니터링
- [ ] 랜딩 → 회원가입 전환율
- [ ] 결제 모달 완료율
- [ ] 대기신청 완료율
- [ ] 모바일 이탈률

운영 메모:
- KPI 스냅샷 스크립트는 `SUPABASE_SERVICE_ROLE_KEY` 설정 후 실행 가능
- 실행 명령: `set -a; source .env.local; set +a; SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/admin-traffic-snapshot.mjs 14`
- KPI 정의/판단 기준: `docs/04-report/features/legal-ux-kpi-monitoring-runbook.md`
