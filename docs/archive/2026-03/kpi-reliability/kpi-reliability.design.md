# kpi-reliability Design Document

> **Summary**: KPI 신뢰성 파이프라인 복구 — 상세 구현 설계.
> markConverted 에러 로깅, CI 동적 임계값, 백필 워크플로 3개 파일 변경 +
> GitHub Actions 수동 트리거로 스냅샷 재생성/백필.
>
> **Author**: Analytics Lead
> **Created**: 2026-03-05
> **Status**: Draft

---

## 0. 사전 확인

| 항목 | 결과 |
|------|------|
| `admin-traffic-snapshot.mjs` `--snapshot-date` 플래그 지원 | **확인됨** (L75-77) |
| `admin-traffic-snapshot.mjs` `--daily` 플래그 지원 | **확인됨** (L67-68) |
| 서비스 롤 키 로컬 환경 보유 여부 | **없음** — CI에서만 실행 가능 |
| R-04 (markConverted 에러 로깅) | **구현 완료** |
| R-05 (CI 동적 임계값) | **구현 완료** |

R-01, R-02, R-03은 서비스 롤 키가 필요하므로 **GitHub Actions에서만 실행 가능**.
백필 워크플로(`backfill-snapshots.yml`) 생성 완료, 수동 트리거 대기 중.

---

## 1. 변경 파일 목록

```
services/pageViewService.ts                        ← R-04 (완료)
.github/workflows/daily-snapshot.yml               ← R-05 (완료)
.github/workflows/backfill-snapshots.yml            ← R-02 지원 (신규, 완료)
docs/04-report/traffic-kpi-daily/ (CI 실행)         ← R-01, R-02 (CI 트리거 필요)
docs/04-report/traffic-kpi-coverage.md (CI 실행)    ← R-03 (CI 백필 후 자동 갱신)
```

---

## 2. 상세 변경 설계

### 2-A. `services/pageViewService.ts` — markConverted 에러 로깅 (R-04)

#### 변경 내용

```ts
// 변경 전 (L69): 에러 묻힘
.then(undefined, () => {});

// 변경 후: 에러 가시화 (fire-and-forget 패턴 유지)
.then(undefined, (err) => { console.error('[pageViewService] markConverted failed', err); });
```

**설계 결정:**
- `throw` 미사용: fire-and-forget 패턴 유지. 로그인 플로우 차단 금지.
- 에러 메시지에 `[pageViewService]` 네임스페이스 포함 → 로그 필터링 용이.
- `track()`, `trackEvent()` 의 `.then(undefined, () => {})` 는 변경하지 않음.
  - 이유: 페이지뷰/이벤트 추적 실패는 KPI에 영향 없음(세션 단위 집계).
  - `markConverted` 만 변환 누락이 CVR에 직접 영향을 주므로 로깅 대상.

---

### 2-B. `.github/workflows/daily-snapshot.yml` — 동적 임계값 (R-05)

#### 변경 내용 (L47-49)

```yaml
# 변경 전: 하드코딩 + 실패 무시
- name: Check snapshot coverage
  continue-on-error: true
  run: node scripts/traffic-snapshot-coverage.mjs 28 27

# 변경 후: 서비스 경과일 기반 동적 임계값
- name: Check snapshot coverage
  run: |
    LAUNCH="2026-02-25"
    DAYS_SINCE=$(( ( $(date -u +%s) - $(date -u -d "$LAUNCH" +%s 2>/dev/null || ...) ) / 86400 ))
    MIN_REQUIRED=$(( DAYS_SINCE < 7 ? 7 : (DAYS_SINCE > 27 ? 27 : DAYS_SINCE) ))
    echo "서비스 경과 ${DAYS_SINCE}일 → 커버리지 임계값: ${MIN_REQUIRED}일/28일"
    node scripts/traffic-snapshot-coverage.mjs 28 "$MIN_REQUIRED"
```

**설계 결정:**
- `continue-on-error` 완전 제거 → 커버리지 미달 시 CI 실패 처리.
- 임계값 = min(max(경과일, 7), 27). 서비스 초기(7일 미만)는 최소 7일 요구.
- 28일 윈도우 기준 최대 27일(주말 제외 buffer 1일).
- macOS/Linux 호환: `date -u -d` (Linux) / `date -u -j -f` (macOS) 폴백 포함.

---

### 2-C. `.github/workflows/backfill-snapshots.yml` — 백필 워크플로 (R-02 지원)

#### 워크플로 설계

```
트리거: workflow_dispatch (수동)
입력:
  - start_date: 백필 시작일 (기본 2026-02-25)
  - end_date: 백필 종료일 (기본 어제)

실행 흐름:
  start_date ~ end_date 날짜 루프
    └─ node scripts/admin-traffic-snapshot.mjs 30 --daily --snapshot-date=YYYY-MM-DD
  커버리지 체크 (min: 7일)
  git commit & push (변경된 스냅샷 파일만)
```

**설계 결정:**
- 날짜 루프: `date` 명령어로 하루씩 증가. macOS/Linux 크로스 플랫폼 폴백 포함.
- 실패 허용: 개별 날짜 실패 시 `|| echo "[warn] 실패 (계속)"` 로 전체 실패 방지.
  - 이유: 초기 날짜(2026-02-25 ~ 2026-02-28)는 실제 데이터 없을 수 있음.
- 커버리지 임계값: 백필 직후 7일로 완화 (서비스 초기 데이터 부재 허용).
- commit 메시지: `chore: backfill traffic snapshots (N일치)` — N은 실제 변경 파일 수.

---

### 2-D. 스냅샷 재생성 절차 (R-01, R-02, R-03)

#### 실행 순서

```bash
# 1. GitHub Actions → Backfill Traffic Snapshots → Run workflow
#    start_date: 2026-02-25
#    end_date:   (비워두면 어제)
#    → 2026-02-25 ~ 2026-03-04 (8일치) 백필

# 2. GitHub Actions → Daily Traffic Snapshot → Run workflow
#    snapshot_date: (비워두면 오늘 = 2026-03-05)
#    → 오늘 스냅샷 재생성 (320% CVR 덮어쓰기)

# 3. 완료 확인
#    docs/04-report/traffic-kpi-coverage.md → 커버리지 ≥ 80%
#    docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-2026-03-05.md → stepCvr ≤ 100%
```

**예상 결과:**

| 날짜 | 기대 stepCvr (Auth Start) | 비고 |
|------|---------------------------|------|
| 2026-02-25 ~ 2026-03-03 | 0% ~ 100% | 실제 데이터 기반 |
| 2026-03-04 | 구 알고리즘 생성 — 재생성 필요할 수 있음 | `--snapshot-date=2026-03-04` |
| 2026-03-05 | **수정된 알고리즘** — ≤ 100% 보장 | 재생성 대상 |

> **주의**: 2026-03-04 스냅샷도 구 알고리즘으로 생성됐을 수 있음.
> 백필 워크플로 `start_date: 2026-02-25` + `end_date: 2026-03-04` 로 03-04도 포함시킬 것.

---

## 3. 구현 순서

```
[완료] Step 1: services/pageViewService.ts — markConverted 에러 로깅 (R-04)
[완료] Step 2: .github/workflows/daily-snapshot.yml — 동적 임계값 (R-05)
[완료] Step 3: .github/workflows/backfill-snapshots.yml — 백필 워크플로 생성
[대기] Step 4: GitHub Actions — backfill-snapshots 수동 트리거 (start: 2026-02-25, end: 2026-03-04)
[대기] Step 5: GitHub Actions — daily-snapshot 수동 트리거 (오늘 재생성)
[대기] Step 6: 커버리지 재확인 — traffic-kpi-coverage.md ≥ 80%
```

---

## 4. 검증 기준

| 기준 | 방법 |
|------|------|
| 모든 stepCvr ≤ 100% | `traffic-kpi-snapshot-*.md` 파일 grep |
| 커버리지 ≥ 80% | `traffic-kpi-coverage.md` 수치 확인 |
| TypeScript clean | `npx tsc --noEmit` (0 errors) |
| markConverted 로깅 존재 | `pageViewService.ts:69` 코드 확인 |
| CI 동적 임계값 존재 | `daily-snapshot.yml` Check step 확인 |

---

## 5. 하위 호환성

| 항목 | 영향 |
|------|------|
| `markConverted` fire-and-forget 유지 | 없음 (에러 로그만 추가) |
| 스냅샷 파일 포맷 변경 없음 | 없음 |
| CI 워크플로 continue-on-error 제거 | **커버리지 미달 시 CI 실패** — 의도된 변경 |
| 백필 워크플로 신규 추가 | 없음 (기존 워크플로 무영향) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial design | Analytics Lead |
