# Design: 밸류에이션 범위 축소 실행계획

> **Plan**: `docs/archive/2026-03/valuation-narrowing/valuation-narrowing.plan.md`
> **Created**: 2026-03-05
> **Feature**: valuation-narrowing (Workstream 3/4/5)

---

## 1. 아키텍처 개요

3개 Workstream의 현재 구현 상태와 잔여 작업을 기반으로 설계한다.

```
Workstream 3 (퍼널 집계)
  └─ scripts/admin-traffic-snapshot.mjs  ← 이미 구현됨
  └─ .github/workflows/daily-snapshot.yml ← 이미 구현됨
  └─ docs/04-report/traffic-kpi-daily/   ← 스냅샷 9개 누적 중
  └─ [GAP] 이벤트 계측 품질 점검표

Workstream 4 (릴리즈 리스크)
  └─ npm run verify:premerge             ← 1개 테스트 실패 잔존
  └─ npm run verify:release              ← 미검증
  └─ 트라이얼 정책 단일화                ← 완료 여부 확인 필요
  └─ [GAP] auth_start 트래킹 테스트 실패

Workstream 5 (데이터룸)
  └─ docs/05-dataroom/ 폴더 구조        ← 이미 생성됨
  └─ 99-index/ (dataroom-index.md)      ← 초안 작성됨
  └─ [GAP] 각 섹션 본문 증빙 미완성
```

---

## 2. Workstream 3: 퍼널 집계 자동화

### 2.1 현재 구현 (완료)

| 항목 | 상태 | 위치 |
|------|:----:|------|
| 일별 스냅샷 스크립트 | ✅ | `scripts/admin-traffic-snapshot.mjs` |
| GitHub Actions 자동 실행 (KST 00:05) | ✅ | `.github/workflows/daily-snapshot.yml` |
| 스냅샷 누적 (9일치) | ✅ | `docs/04-report/traffic-kpi-daily/` |
| 이벤트 스키마 동결 문서 | ✅ | `docs/03-design/event-schema-freeze-2026-03-04.md` |

### 2.2 잔여 설계 (구현 필요)

#### FR-W3-01: 이벤트 계측 품질 점검표
- 위치: `docs/04-report/traffic-kpi-daily/quality-check-template.md`
- 내용: 누락률 / 중복 이벤트율 / 세션 분해 실패율 주간 체크
- 형식: 체크리스트 마크다운 (수동 입력)

#### FR-W3-02: 성공 기준 달성 추적
- 유효 세션 300+ 달성 여부 주간 확인
- session_id 누락률 1% 미만 유지
- 28일 중 27일 스냅샷 누적 검증 (GitHub Actions 실패 알림으로 커버)

### 2.3 데이터 흐름

```
Supabase page_views/events → scripts/admin-traffic-snapshot.mjs
  → docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-YYYY-MM-DD.md
  → GitHub Actions 자동 커밋 (daily-snapshot.yml)
```

---

## 3. Workstream 4: 릴리즈 리스크 제거

### 3.1 현재 상태

| 항목 | 상태 | 비고 |
|------|:----:|------|
| TypeScript 컴파일 | ✅ | 0 errors |
| `verify:premerge` | ❌ | auth_start 트래킹 테스트 1건 실패 |
| `verify:release` | ❓ | 미실행 |
| 트라이얼 정책 정렬 | ✅ | 14일/28일 단일화 완료 |

### 3.2 잔여 설계

#### FR-W4-01: auth_start 트래킹 테스트 수정
- **원인**: `AuthForm` 리팩터링 (`useAuthForm` 훅 분리)으로 `trackEvent('auth_start'` 위치 변경
- **수정 대상**: 테스트 파일에서 추적 위치 업데이트 또는 AuthForm에 trackEvent 복원
- **파일**: `src/__tests__/` 또는 vitest/jest 테스트 파일 위치 확인 필요

#### FR-W4-02: verify:premerge 3회 연속 Green
- premerge 스크립트 실행 후 결과 캡처
- 결과 파일: `docs/05-dataroom/04-security-operations/verify-premerge-log-YYYY-MM-DD.md`

#### FR-W4-03: verify:release 1회 Green
- release 게이트 실행
- 결과 파일: `docs/05-dataroom/04-security-operations/verify-release-log-YYYY-MM-DD.md`

---

## 4. Workstream 5: 데이터룸 증빙

### 4.1 폴더 구조 (현재)

```
docs/05-dataroom/
  01-commercial/      ← README만 (내용 없음)
  02-legal/           ← README만 (내용 없음)
  03-security/        ← README만 (내용 없음)
  04-security-operations/  ← 보안 증빙 일부 작성됨
  05-policy-versioning/    ← 정책 버전 이력
  06-investor-pack/        ← 투자자 패키지
  99-index/           ← 인덱스 + 체크리스트
```

### 4.2 섹션별 잔여 설계

#### FR-W5-01: 01-commercial (상업 증빙)
```
01-commercial/
  contract-list.md       ← 계약서 목록 (고객사, 계약일, 금액)
  billing-reconciliation.md ← 월별 청구/수금 대사
  mrr-summary.md         ← MRR 추이
```

#### FR-W5-02: 02-legal (법무 증빙)
```
02-legal/
  terms-version-history.md  ← 약관 버전 이력 (이미 LegalModal에서 추출됨)
  privacy-version-history.md ← 개인정보 처리방침 버전
  refund-policy-history.md  ← 환불정책 버전
```

#### FR-W5-03: 03-security (보안 증빙)
```
03-security/
  rls-policy-index.md   ← RLS 마이그레이션 목록
  incident-log.md       ← 사고 대응 기록 (P0/P1/P2/P3)
```

### 4.3 완성 기준

| 섹션 | 완성 기준 |
|------|---------|
| 01-commercial | 유료 고객 계약-청구-수금 100% 추적 가능 |
| 02-legal | 약관/개인정보/환불 정책 최신 버전 확인 가능 |
| 03-security | RLS 정책 목록 + 사고 대응 기록 존재 |
| 99-index | 전체 인덱스가 실제 파일과 일치 |

---

## 5. 구현 순서

### Week 1 (즉시 — 높은 우선순위)
1. **FR-W4-01**: auth_start 테스트 수정 → verify:premerge Green
2. **FR-W4-02**: premerge 3회 연속 실행 + 결과 저장
3. **FR-W4-03**: verify:release 실행 + 결과 저장

### Week 2 (데이터룸 내용 채우기)
4. **FR-W5-01**: 01-commercial 상업 증빙 작성
5. **FR-W5-02**: 02-legal 법무 증빙 작성
6. **FR-W5-03**: 03-security 보안 증빙 보완

### 지속 운영 (자동화)
7. **FR-W3-01**: 품질 점검표 주간 운영
8. **FR-W3-02**: 유효 세션 300+ 달성 모니터링

---

## 6. 성공 기준 (Plan 기반)

| Workstream | 기준 | 현재 달성 |
|-----------|------|:--------:|
| WS3-1 | 유효 세션 300+ | 확인 필요 |
| WS3-2 | session_id 누락률 1% 미만 | 확인 필요 |
| WS3-3 | 28일 중 27일 스냅샷 | 9일 누적 중 |
| WS4-1 | verify:premerge 3회 Green | ❌ (테스트 실패) |
| WS4-2 | verify:release 1회 Green | ❓ 미실행 |
| WS4-3 | 트라이얼 정책 단일화 | ✅ |
| WS5-1 | 상업 증빙 100% 추적 | ❌ 미완 |
| WS5-2 | 법무 증빙 패키지화 | 부분 완료 |
| WS5-3 | 보안 증빙 패키지화 | 부분 완료 |

---

## 7. 파일 변경 목록

| 파일 | 변경 | Workstream |
|------|------|:----------:|
| `테스트 파일` | auth_start 테스트 수정 | WS4 |
| `docs/05-dataroom/04-security-operations/verify-premerge-*.md` | 신규 | WS4 |
| `docs/05-dataroom/04-security-operations/verify-release-*.md` | 신규 | WS4 |
| `docs/05-dataroom/01-commercial/*.md` | 신규 | WS5 |
| `docs/05-dataroom/02-legal/*.md` | 신규 | WS5 |
| `docs/05-dataroom/03-security/*.md` | 신규 | WS5 |
| `docs/04-report/traffic-kpi-daily/quality-check-template.md` | 신규 | WS3 |
