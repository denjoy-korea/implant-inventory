# kpi-reliability Planning Document

> **Summary**: KPI 신뢰성 파이프라인 복구 — 오염 스냅샷 재생성, 백필, 에러 로깅 강화, CI 커버리지 임계값 동적화
>
> **Project**: DenJOY (implant-inventory)
> **Version**: 1.0
> **Author**: Product Manager
> **Date**: 2026-03-05
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

funnel-cvr-fix(2026-03-05)로 CVR 알고리즘을 eligible sessions 기반으로 교체했으나, 교체 이전에 생성된 스냅샷 파일이 여전히 >100% CVR을 표기하고 있다. 이 플랜은 KPI 신뢰성 파이프라인 전반을 복구하여 투자자 데이터룸 및 내부 지표를 신뢰할 수 있는 상태로 만드는 것을 목표로 한다.

### 1.2 Background

현재 4가지 문제가 존재한다.

| 코드 | 심각도 | 문제 |
|------|--------|------|
| P1 | Critical | 기존 스냅샷 오염 — `traffic-kpi-snapshot-2026-03-05.md` Auth Start Step CVR = 320% |
| P2 | High | 스냅샷 커버리지 7% — 출시(2026-02-25) 이후 10일 중 2일치(03-04, 03-05)만 존재 |
| P3 | High | CI 커버리지 실패 무시 — `continue-on-error: true`로 0%여도 워크플로 성공 처리 |
| P4 | Medium | markConverted 실패 무음 처리 — Supabase 에러가 묻혀 전환 누락 가능 |

**P1 영향**: 투자자 데이터룸에 CVR 320% 수치가 노출될 경우 데이터 신뢰도 훼손.
**P2 영향**: 커버리지 7%로 KPI 트렌드 분석 불가, CI 커버리지 체크가 의미 없음.
**P3 영향**: CI가 커버리지 0%를 성공으로 처리하므로 모니터링 체계 자체가 무력화.
**P4 영향**: 전환 이벤트 누락이 CVR 저평가로 이어질 수 있으나 가시성이 없음.

### 1.3 Related Documents

- 관련 플랜: `docs/01-plan/features/funnel-cvr-fix.plan.md`
- KPI 커버리지: `docs/04-report/traffic-kpi-coverage.md`
- 스냅샷 디렉토리: `docs/04-report/traffic-kpi-daily/`
- CI 워크플로: `.github/workflows/daily-snapshot.yml`
- 영향 서비스: `services/pageViewService.ts`, `hooks/useAppState.ts`

---

## 2. Scope

### 2.1 In Scope

- [x] 오늘(2026-03-05) 스냅샷 재생성 (수정된 알고리즘으로 덮어쓰기)
- [x] 2026-02-25 ~ 2026-03-03 (8일치) 스냅샷 백필
- [x] 백필 완료 후 `traffic-kpi-coverage.md` 커버리지 재확인
- [x] `pageViewService.ts` markConverted 에러 `console.error` 로깅 추가
- [x] `daily-snapshot.yml` 커버리지 임계값 동적 계산 로직 도입

### 2.2 Out of Scope

- Supabase pageview 테이블 스키마 변경
- funnel 이벤트 추가 또는 재정의
- 스냅샷 파일 포맷 변경 (알고리즘 버전 메타데이터 이외의 구조 변경)
- Slack 알림 연동 (P3 후속 대응, Could 항목)
- 과거 스냅샷의 수동 데이터 보정 (실제 Supabase 쿼리 기반 재생성만)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | MoSCoW | 상태 |
|----|----------|----------|--------|------|
| R-01 | 2026-03-05 스냅샷을 수정된 알고리즘(`node scripts/admin-traffic-snapshot.mjs 30 --daily`)으로 재생성하여 기존 파일 덮어쓰기 | Critical | Must | Pending |
| R-02 | `--snapshot-date=YYYY-MM-DD` 플래그로 2026-02-25 ~ 2026-03-03 (8일치) 백필 실행 | High | Must | Pending |
| R-03 | 백필 완료 후 `traffic-kpi-coverage.md` 커버리지 ≥ 80% 달성 확인 (목표: 10일/10일 = 100%) | High | Must | Pending |
| R-04 | `services/pageViewService.ts:69` markConverted의 catch 핸들러에 `console.error` 로깅 추가 (fire-and-forget 패턴 유지) | Medium | Must | Pending |
| R-05 | `.github/workflows/daily-snapshot.yml` 커버리지 임계값을 서비스 출시일(`2026-02-25`) 기준 경과 일수로 동적 계산 (7일 이내: `continue-on-error: true`, 이후: `false`) | High | Should | Pending |
| R-06 | 스냅샷 파일 상단 메타데이터에 생성 알고리즘 버전(`algorithm_version`) 및 재생성 여부(`regenerated`) 필드 추가 | Low | Could | Pending |
| R-07 | CI 커버리지 임계값 미달 시 Slack 알림 전송 | Low | Could | Pending |

### 3.2 Non-Functional Requirements

| 카테고리 | 기준 | 측정 방법 |
|----------|------|-----------|
| 정확성 | 모든 스냅샷의 stepCvr ≤ 100% | 스냅샷 파일 수동 검토 |
| 커버리지 | `traffic-kpi-coverage.md` ≥ 80% | 스크립트 실행 후 파일 확인 |
| 타입 안전성 | `npm run typecheck` clean (0 errors) | CI typecheck |
| 사이드이펙트 없음 | markConverted 에러 로깅 추가 후 기존 fire-and-forget 동작 유지 | 코드 리뷰 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] R-01: `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-2026-03-05.md`의 모든 stepCvr ≤ 100%
- [ ] R-02: `docs/04-report/traffic-kpi-daily/` 에 2026-02-25 ~ 2026-03-05 파일 10개 존재
- [ ] R-03: `traffic-kpi-coverage.md` 커버리지 수치 ≥ 80%
- [ ] R-04: `pageViewService.ts` markConverted catch 블록에 `console.error` 존재 (코드 리뷰 확인)
- [ ] R-05: `daily-snapshot.yml` 에 출시일 기준 동적 임계값 로직 존재

### 4.2 Quality Criteria

- [ ] `npm run typecheck` clean
- [ ] 스냅샷 재생성/백필 후 `docs/04-report/traffic-kpi-coverage.md` 자동 갱신
- [ ] 기존 CI 워크플로 동작 이상 없음 (daily-snapshot.yml 다음 실행 성공)

---

## 5. Risks and Mitigation

| 위험 | 영향 | 가능성 | 대응 |
|------|------|--------|------|
| 과거 날짜 Supabase 쿼리 데이터 부재 (2026-02-25 이전 세션 없음) | Low | Low | 빈 스냅샷(0 sessions)으로 생성 허용. 커버리지 파일에 "데이터 없음" 표기. |
| `--snapshot-date` 플래그가 `admin-traffic-snapshot.mjs`에 미구현 | High | Medium | 구현 전 스크립트 확인 필수. 미구현 시 Do 단계에서 플래그 추가 구현 필요. |
| markConverted `console.error` 추가 후 에러 스팸 발생 | Medium | Low | 에러 메시지에 컨텍스트(hospitalId, sessionId) 포함하여 필터링 가능하게 구성. |
| CI 동적 임계값 로직 오류로 워크플로 브레이킹 | High | Low | PR 머지 전 `act` 또는 로컬 실행으로 yml 검증. |
| 스냅샷 재생성 중 Supabase rate limit | Medium | Low | 날짜별 순차 실행, 각 실행 사이 1초 sleep 권장. |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — 기존 프로젝트 수준 유지. 신규 서비스/컴포넌트 생성 없음.

### 6.2 영향 파일

| 파일 | 변경 유형 | 변경 내용 |
|------|-----------|-----------|
| `scripts/admin-traffic-snapshot.mjs` | 확인/수정 | `--snapshot-date` 플래그 지원 여부 확인, 미구현 시 추가 |
| `services/pageViewService.ts` | 수정 | markConverted catch 핸들러 `console.error` 추가 |
| `.github/workflows/daily-snapshot.yml` | 수정 | 커버리지 임계값 동적 계산 로직 (출시일 기준 경과 일수) |
| `docs/04-report/traffic-kpi-daily/` | 재생성 | 오늘 스냅샷 덮어쓰기 + 8일치 백필 파일 생성 |
| `docs/04-report/traffic-kpi-coverage.md` | 재생성 | 스냅샷 재생성 후 커버리지 재계산 |

### 6.3 CI 동적 임계값 설계 (R-05)

```yaml
# daily-snapshot.yml 변경 방향
- name: Coverage check
  run: |
    LAUNCH_DATE="2026-02-25"
    TODAY=$(date +%Y-%m-%d)
    DAYS_SINCE=$(( ($(date -d "$TODAY" +%s) - $(date -d "$LAUNCH_DATE" +%s)) / 86400 ))
    # 출시 7일 이내: 경고만 (continue-on-error: true)
    # 출시 7일 이후: 실패 처리 (continue-on-error: false)
    if [ "$DAYS_SINCE" -gt 7 ]; then
      node scripts/check-kpi-coverage.mjs --min-coverage=80 --fail-on-missing
    else
      node scripts/check-kpi-coverage.mjs --min-coverage=80 || true
    fi
```

---

## 7. Convention Prerequisites

### 7.1 기존 규약 확인

- [x] `CLAUDE.md` 코딩 규약 존재
- [x] Supabase 에러 핸들링 패턴: fire-and-forget (`console.error` 로깅 허용)
- [x] 스냅샷 파일 명명 규칙: `traffic-kpi-snapshot-YYYY-MM-DD.md`

### 7.2 환경 변수 (기존, 신규 없음)

| 변수 | 용도 | 비고 |
|------|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 스냅샷 스크립트 Supabase 접근 | 기존 |
| `VITE_SUPABASE_URL` | 클라이언트 Supabase URL | 기존 |

---

## 8. Implementation Order

빠른 신뢰도 복구 우선 순서:

1. **R-01** — 오늘 스냅샷 재생성 (P1 즉시 해결, ~5분)
2. **R-02** — 백필 스크립트 실행 8회 (P2, ~15분)
3. **R-03** — 커버리지 재확인 (P2 완료 검증, ~5분)
4. **R-04** — markConverted 에러 로깅 (P4, ~10분)
5. **R-05** — CI 동적 임계값 (P3, ~20분)

총 예상 소요: 약 1시간

---

## 9. Next Steps

1. [ ] CTO(팀 리드) Plan 승인
2. [ ] Design 문서 작성 (`docs/02-design/features/kpi-reliability.design.md`)
3. [ ] `scripts/admin-traffic-snapshot.mjs` `--snapshot-date` 플래그 지원 여부 확인
4. [ ] 구현 착수

---

## Version History

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1 | 2026-03-05 | 초안 작성 | Product Manager |
