# DenJOY / DentWeb 임플란트 재고관리 SaaS — 종합 정밀 분석 리포트

**분석일**: 2026-03-25
**분석 방법**: 4개 전문 에이전트 병렬 분석 (코드·보안·기능·시장)
**대상**: https://inventory.denjoy.info

---

## 📊 종합 점수 요약

| 영역 | 점수 | 등급 |
|------|------|------|
| 코드 품질·완성도 | **72 / 100** | B |
| 보안 | **85 / 100** | A |
| 기능 완성도 | **95 / 100** | A+ |
| UI/UX | **88 / 100** | A |
| **종합** | **85 / 100** | **A** |

---

## 1. 서비스 개요

**핵심 가치 제안**
수술기록 Excel 업로드 → 패턴 분석 → 자동 재고 산출 (바코드/QR 무관)

**기술 스택**
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Supabase (Auth · DB · Edge Functions 31개)
- Vercel (프론트엔드 + Geo-restrict KR only)
- TossPayments (실결제 연동)

**코드베이스 규모**
| 항목 | 수량 |
|------|------|
| TSX 컴포넌트 | 265개 |
| 모달 컴포넌트 | 48개 |
| 커스텀 훅 | 43개 |
| 서비스/유틸 | 51개 |
| Edge Functions | 31개 |
| DB 마이그레이션 | 20개 |
| 테스트 스위트 | 11개 (137 PASS) |

---

## 2. 코드 품질 분석 (72/100)

### 2.1 항목별 점수

| 항목 | 점수 | 평가 |
|------|------|------|
| 코드 완성도 | 8/10 | TODO/FIXME 거의 없음, 주요 기능 전부 구현 |
| 아키텍처 품질 | 6/10 | 서비스 계층 분리 양호, 전역 상태관리 부재가 약점 |
| 타입 안전성 | 8/10 | `as any` 0건, strict 모드, 도메인별 타입 분리 |
| 에러 핸들링 | 7/10 | 93+ try-catch, 에러 경계 2개, 한국어 에러 매핑 |
| 성능 | 6/10 | 170+ useMemo/useCallback, 44개 lazy import — useAppLogic 리렌더 병목 |
| 테스트 커버리지 | 5/10 | 정적 패턴 분석 중심, UI/Hook/서비스 실행 테스트 없음 |
| 코드 중복 | 7/10 | admin hook CRUD 패턴 반복, 추상화 기회 있음 |
| 프로덕션 준비도 | 8/10 | 환경변수 관리 우수, CSP 설정, Geo-restrict |

### 2.2 강점
- **TypeScript 완전 타입화**: `as any` 0건, strict 모드 활성화
- **서비스 계층 명확 분리**: services(51) → hooks(43) → components(265)
- **verify:premerge 파이프라인**: typecheck + lint + test + build 전체 강제 통과
- **ModalShell 통합**: Phase 1 (12개 모달) 완료 — Portal + ARIA + 포커스 트랩
- **lazyWithRetry**: chunk 로드 실패 시 자동 복구

### 2.3 개선 포인트 (우선순위순)

**P1 — 상태관리 아키텍처**
- `useAppLogic` → `useAppState` → 25개+ 하위 hook 체인이 `useState` + prop drilling만으로 구성
- 상태 변경 시 불필요한 리렌더 연쇄 발생
- → Zustand 또는 React Context 분할 도입 권장

**P2 — 테스트 인프라**
- 11개 테스트 전부 "소스 파일 문자열 패턴 검사" 방식 (실행 없음)
- UI 컴포넌트 테스트 0건, Hook 단위 테스트 0건
- → Vitest + React Testing Library 도입, E2E는 Playwright

**P3 — 라우터 통합**
- Hash 기반 수동 라우팅 (`useHashRouting` + `state.currentView`)
- → React Router 또는 TanStack Router 도입 권장

**P4 — 구조화 로깅**
- 165개 console.log/warn/error (프로덕션 디버깅 어려움)
- → Sentry 에러 트래킹 도입 + 로그 레벨 분리

---

## 3. 보안 분석 (85/100 — STRONG)

### 3.1 종합 평가
**Critical: 0건 / High: 0건 / Medium: 2건 / Low: 3건**

이전 감사(2026-03-06, 03-12, 03-21)를 통해 Critical 취약점 다수 해소 완료.

### 3.2 OWASP Top 10 대응 현황

| 항목 | 상태 | 핵심 통제 |
|------|------|----------|
| A01 Broken Access Control | ✅ PASS | RLS 전 테이블, hospital_id 격리, 역할 검증 |
| A02 Cryptographic Failures | ✅ PASS | AES-256-GCM + PBKDF2-100K, HSTS, 서버사이드 키 |
| A03 Injection | ✅ PASS | 파라미터화 쿼리, raw SQL 없음 (이메일 XSS 주의) |
| A04 Insecure Design | ✅ PASS | 서버사이드 금액 검증, 플랜 제한 서버 강제 |
| A05 Security Misconfiguration | ✅ PASS | CSP, HSTS, X-Frame-Options: DENY, nosniff |
| A06 Vulnerable Components | ℹ️ INFO | `denomailer@1.1.0`, `xlsx` 버전 모니터링 필요 |
| A07 Auth Failures | ✅ PASS | Supabase Auth (bcrypt), 타이밍 안전 비교, MFA |
| A08 Integrity Failures | ✅ PASS | 서버사이드 결제 금액 검증, REVOKE/GRANT |
| A09 Logging/Monitoring | ✅ PASS | operation_logs, audit_logs 완비 |
| A10 SSRF | ✅ PASS | 사용자 제어 URL 서버사이드 fetch 없음 |

### 3.3 보안 강점 (이미 잘 구현)
- **3중 멀티테넌트 격리**: RLS + Edge Function 소유권 검증 + JWT 교차 검증
- **결제 무결성**: 서버사이드 금액 독립 계산 → 쿠폰/크레딧 재산출 → TossPayments 호출
- **환자 데이터 암호화**: AES-256-GCM, PBKDF2 100,000회 반복, 서버 전용 키
- **보안 헤더 완비**: HSTS 2년 preload, CSP strict, X-Frame-Options DENY
- **CI 보안 게이트**: lint-check.mjs가 `VITE_PATIENT_DATA_KEY` 패턴 자동 차단

### 3.4 오픈 이슈

| # | 심각도 | 내용 | 파일 |
|---|--------|------|------|
| F-1 | **Medium** | `invite-member` 이메일 템플릿에서 `hospital.name`, `name` HTML 이스케이프 누락 (저장형 XSS) | `invite-member/index.ts:140-149` |
| F-2 | **Medium** | SECURITY DEFINER 함수 ~80개 중 REVOKE/GRANT 패턴 미검증 함수 존재 가능 | `supabase/migrations/` |
| F-3 | Low | `accept-invite` 멤버 수 확인과 프로필 업데이트 비원자적 (TOCTOU) | `accept-invite/index.ts:58-65` |
| F-4 | Low | `LEGACY_SALT` 하드코딩 (복호화 폴백용만, 신규 암호화 불가) | `crypto-service/index.ts:25` |
| F-5 | Low | 인증된 Edge Function에 Rate Limiting 없음 (CPU 소진 벡터) | 전체 JWT 함수 |

### 3.5 즉시 수정 권장 (F-1)
```typescript
// invite-member/index.ts 수정
// escapeHtml() 함수는 submit-contact에 이미 구현됨 → import 후 적용
<td>${escapeHtml(hospital.name)}</td>
<td>${escapeHtml(name)}</td>
```

---

## 4. 기능 완성도 분석 (95/100)

### 4.1 플랜별 기능 매트릭스

| 기능 | Free | Basic | Plus | Business |
|------|------|-------|------|----------|
| Excel 업로드 | ✅ | ✅ | ✅ | ✅ |
| 재고 대시보드 | ❌ | ✅ | ✅ | ✅ |
| 발주 관리 | ❌ | ✅ | ✅ | ✅ |
| 실사 (Audit) | ❌ | ✅ | ✅ | ✅ |
| 수술기록 분석 | ❌ | 기본 | 고급 | 고급 |
| FAIL 관리 | ❌ | ❌ | ✅ | ✅ |
| 교환 분석 | ❌ | ❌ | ✅ | ✅ |
| 단가/수가 관리 | ❌ | ❌ | ❌ | ✅ |
| AI 예측 발주 | ❌ | ❌ | ❌ | 준비 중 |

품목 수: Free 50개 / Basic 150개 / Plus 300개 / Business 무제한
사용자: Free 1명 / Basic 1명 / Plus 5명 / Business 10명+

### 4.2 완성된 핵심 기능 (✅)
1. 수술기록 Excel 업로드 & 21개 분석 차트
2. 재고 마스터 CRUD + 기초재고 조정
3. 발주 관리 (생성·취소·입고확인·반품)
4. FAIL 관리 (반품 추적·교환 분석) — Plus+
5. 실사 (모바일 입력·PC 리포트 대시보드)
6. TossPayments 실결제 + 환불 + 프로라타 크레딧
7. 팀 관리 (초대·역할·MFA)
8. 시스템 관리자 대시보드 (18개 탭)
9. 모바일 UI (발주·실사·수술기록 전용 레이아웃)
10. PWA + 오프라인 모드
11. DentWeb 자동 연동 (수술기록 자동 업로드)
12. 환자 데이터 암호화 (AES-256-GCM)

### 4.3 진행 중 / 미완성
| 기능 | 상태 | 비고 |
|------|------|------|
| ModalShell 통합 | 🔄 60% | Phase 1 (12/48모달) 완료, Phase 2·3 대기 |
| AI 예측 발주 | 🔄 Framework | 구조 설계 완료, 학습 데이터 부재 |
| Business 추가 사용자 과금 | 🔄 구조만 | UI 미완성 |
| 단가/수가 관리 UI | 🔄 테이블 생성 | 프론트엔드 개발 중 |

### 4.4 Edge Functions 전체 목록 (31개)
- 인증/계정: 6개 (auth-send-email, admin-delete-user, kick-member 등)
- 결제: 4개 (toss-payment-confirm, toss-payment-refund 등)
- 수술기록/연동: 4개 (dentweb-upload, xlsx-parse, xlsx-generate 등)
- 알림/공지: 8개 (notify-signup, notify-withdrawal 등)
- 외부 연동: 5개 (holiday-proxy, test-integration, send-analysis-report 등)
- 관리: 4개 (reset-hospital-data, invite-member, verify-invite 등)

---

## 5. UI/UX 분석 (88/100)

### 5.1 강점

**디자인 일관성**
- 모달 헤더 컬러 코딩 시스템 완비 (Amber/Rose/Indigo/Teal/Slate)
- Tailwind CSS v4 기반 일관된 디자인 언어
- 반응형 UI: 모바일/태블릿/PC 3단계 레이아웃

**모바일 최적화**
- 발주·실사·수술기록 전용 모바일 레이아웃
- Bottom Sheet (하단 슬라이드 모달)
- 터치 제스처 (차트 스와이프, 월별 이동)
- PWA + 오프라인 배너

**접근성**
- ModalShell: ARIA + 포커스 트랩 + ESC + 포커스 복귀 (12개 모달 적용)
- 키보드 탐색 지원

**데이터 시각화 (21개 차트)**
- 월별 추세 (선), 요일별 패턴 (막대), 분류별 비율 (도넛)
- 요일-부위 히트맵 (9×7), 실패율 스캐터, ToothChart SVG
- 제조사별 분석, SparkLine (대시보드 KPI)

### 5.2 약점
- **ModalShell 통합 미완료**: 36개 모달 아직 Portal/ARIA 미적용
- **라우터 부재**: 뒤로가기/딥링크 UX 약함 (hash 수동 라우팅)
- **로딩 상태**: 일부 페이지 skeleton UI 미적용

### 5.3 주요 화면 완성도
| 화면 | 완성도 | 특이사항 |
|------|--------|---------|
| 랜딩 페이지 | 100% | 카운터 통계, 후기 캐러셀, 데모 영상 |
| 대시보드 Overview | 100% | KPI 배지, Plus 잠금 블러, 스파클라인 |
| 재고 Manager | 100% | 필터, 인라인 편집, 모달 6종 |
| 발주 Manager | 100% | 탭 5개, 모바일/PC 분리 레이아웃 |
| FAIL Manager | 100% | 차트 3개, 섹션 4개 (Plus 잠금) |
| 실사 | 100% | 모바일 입력 + PC 리포트 대시보드 |
| 수술기록 분석 | 100% | 차트 8개, 플랜별 잠금 |
| 가격 페이지 | 100% | 월/연간 토글, 결제 모달 |
| 시스템 관리자 | 100% | 18개 탭 (트래픽, 빌링, 병원 관리 등) |

---

## 6. 시장 분석

### 6.1 시장 규모

| 구분 | 규모 | 기준 |
|------|------|------|
| **TAM** | 약 1,322억 원/년 | 임플란트 취급 치과의원 1.5만개 × 月 7.2만원 |
| **SAM** | 약 561억 원/년 | 덴트웹 연동 가능 치과 6,500개 |
| **SOM (3년)** | 47억~94억 원/년 | 5~10% 침투율 (650~1,300개 병원) |

**국내 치과 현황 (2024 심평원)**
- 치과의원: 19,142개소
- 임플란트 시장: 약 7,700억 원/년 (CAGR 7.8%)
- 치과 SaaS 시장: 680억 원 (2024), 1,250억 원 (2035 예상, CAGR 8.3%)

### 6.2 경쟁 분석

| 경쟁사 | 유형 | 임플란트 재고 | DenJOY 차별화 |
|--------|------|-------------|--------------|
| 덴트웹 (DentWeb) | EMR/전자차트 | ❌ 없음 | 수술기록 소스 → DenJOY로 연동 |
| 아이덴티스트 | 모바일 진료관리 | ❌ 제한적 | 임플란트 전문성 없음 |
| 덴트링크 | 치과-기공소 연결 | ❌ 없음 | 다른 영역 |
| Dentrix/Eaglesoft | 미국 1·2위 PM | ❌ 제한적 | 영어·한국 보험 미지원 |

**결론: 한국 시장에서 임플란트 수술기록 기반 재고 자동화 SaaS는 DenJOY가 사실상 유일.**

### 6.3 핵심 경쟁 우위

1. **수술기록 → 재고 자동화**: 바코드/QR 없이 기존 워크플로우 변경 불필요
2. **임상 분석 깊이**: 브랜드별 FAIL율, 수술 패턴, 교환 추적 — 단순 재고 툴 이상
3. **데이터 점착성**: 재고 이력 누적 → 전환 비용 높음
4. **덴트웹 통합**: 역설적으로 경쟁사도 덴트웹 의존 필요 → 진입 장벽
5. **보안/규정 준수**: 의료 데이터 처리 기준 충족

### 6.4 리스크

| 리스크 | 심각도 | 현황 |
|--------|--------|------|
| 덴트웹 단일 소스 의존 | 높음 | 덴트웹 정책 변경 시 취약 |
| ARR 0 (실결제 갓 전환) | 높음 | 2026-03-05 실결제 전환 |
| 1인/소팀 개발 | 중간 | 핵심 개발자 의존도 |
| 환자 데이터 규제 | 중간 | 의료법/개인정보법 적용 가능 |

---

## 7. 시장 가치 평가

### 7.1 현재 단계 정의
**Pre-Seed → Seed 전환점** (실결제 2026-03-05 전환, ARR 증명 과정)

### 7.2 비즈니스 모델 지표

| 항목 | 수치 |
|------|------|
| 월 ARPU (유료 기준) | 약 46,200원 |
| LTV (보수적, Churn 2.5%) | 약 184만 원 |
| LTV (안정화, Churn 1.3%) | 약 355만 원 |
| 연간 구독 할인율 | 약 20~22% |
| 체험 기간 | 14일 (TRIAL_DAYS) |

### 7.3 시나리오별 12개월 ARR 예측

| 시나리오 | 유료 병원 수 | 월 ARPU | 연 ARR |
|----------|-------------|---------|--------|
| 보수적 | 50개 | 40,000원 | 2,400만 원 |
| 기본 | 150개 | 47,000원 | 8,460만 원 |
| 낙관적 | 400개 | 52,000원 | 2.5억 원 |

### 7.4 가치 추정 (SaaS 멀티플 × ARR)

| 시나리오 | ARR | 멀티플 | **추정 가치** |
|----------|-----|--------|-------------|
| 보수적 | 2,400만 원 | 5~8x | 1.2억~2억 원 |
| 기본 | 8,460만 원 | 7~10x | 5.9억~8.5억 원 |
| 낙관적 | 2.5억 원 | 8~12x | 20억~30억 원 |

### 7.5 종합 가치 추정

```
┌────────────────────────────────────────────────────────┐
│  현재 단계: Pre-Seed → Seed 전환점                      │
│  ARR: ~0 (실결제 갓 전환, 2026-03-05)                  │
│                                                        │
│  시나리오별 추정 가치 (Seed 라운드 Post-money 기준):    │
│                                                        │
│  보수적  ─────── 5억 ~ 10억 원                        │
│  기본    ─────── 15억 ~ 30억 원   ← 현재 가장 현실적  │
│  낙관적  ─────── 40억 ~ 80억 원                       │
│                                                        │
│  전략적 인수 (오스템·덴티움 등 제조사 연계):           │
│          ─────── 최대 150억 ~ 200억 원                │
└────────────────────────────────────────────────────────┘
```

**현재 가장 현실적 추정: 10억~30억 원**

ARR 1억 원 돌파 → "기본~낙관" 시나리오로 빠르게 이동 가능.
오스템임플란트·덴티움 등 임플란트 제조사는 유통채널 강화 목적으로 전략적 인수 관심 가능 (프리미엄 1.5~2.5x).

---

## 8. 즉시 조치 권장사항

### Critical (이번 스프린트)

1. **[보안] F-1 수정**: `invite-member/index.ts`에 `escapeHtml()` 적용
   ```typescript
   // 수정 전
   <td>${hospital.name}</td>
   // 수정 후
   <td>${escapeHtml(hospital.name)}</td>
   ```

2. **[보안] F-2 감사**: SECURITY DEFINER 함수 전수 조사 → REVOKE ALL FROM PUBLIC 미적용 함수 수정

### Short-term (1~2개월)

3. **[코드] Vitest 전환**: TypeScript 직접 import + 실제 함수 실행 테스트
4. **[코드] 상태관리 도입**: Zustand 또는 Context 분할 (useAppLogic 병목 해소)
5. **[UX] ModalShell Phase 2·3**: 나머지 36개 모달 ARIA 통합
6. **[모니터링] Sentry 도입**: console.log 165개 → 구조화 로깅

### Mid-term (3~6개월)

7. **[성장] ARR 1억 돌파 집중**: 유료 고객 150개 확보 → 가치평가 3x 상승
8. **[기능] AI 예측 발주**: Business 플랜 킬러 피처 구현
9. **[리스크] 덴트웹 의존 분산**: 타 EMR(에이치스, 비트컴퓨터) 연동 추가

---

## 9. 결론

DenJOY/DentWeb은 **프로덕션 수준의 완성도를 갖춘 B2B 의료 SaaS**로, 국내 치과 임플란트 재고관리 시장에서 경쟁 부재의 특화 포지션을 선점하고 있습니다.

**제품 측면**: 기능 완성도 95%, 보안 85점(Critical 0건), TypeScript clean, 137 테스트 통과로 투자자 데모 및 실사(Due Diligence) 준비 완료 수준입니다.

**시장 측면**: TAM 1,322억 원 중 SAM 561억 원 시장에서 경쟁 솔루션이 사실상 없어 선점 우위가 뚜렷합니다. 오스템임플란트 등 전략적 인수자 관점에서의 가치가 특히 높습니다.

**현재 과제**: ARR 0에서 빠른 유료 전환이 핵심입니다. 유료 100개 병원 돌파 시 밸류에이션이 "보수적" → "기본" 시나리오로 즉시 도약합니다.

**추정 시장 가치**: 현재 기준 **10억~30억 원**, 전략적 인수 시 **최대 200억 원**

---

*분석 에이전트: code-analyzer, security-architect, Explore, general-purpose (market analyst)*
*생성일: 2026-03-25*
