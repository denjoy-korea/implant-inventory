# funnel-cvr-fix Plan Document

> **Summary**: 퍼널 Step CVR 100% 초과 버그 수정. 현재 단순 비율(stage_n+1 / stage_n) 산식을
> "이전 단계를 통과한 세션(eligible sessions) 기준"으로 교체하여 0~100% 범위를 항상 보장한다.
>
> **Author**: Analytics Lead
> **Created**: 2026-03-05
> **Last Modified**: 2026-03-05
> **Status**: Draft

---

## 1. 문제 진단

### 1.1 현재 산식 (버그)

```js
// funnel-kpi-utils.mjs:102-106
const eventFunnelWithCvr = eventFunnel.map((stage, index) => {
  if (index === 0) return { ...stage, stepCvr: null };
  const prevCount = eventFunnel[index - 1].count;          // 이전 stage의 전체 세션 수
  return { ...stage, stepCvr: toPct(stage.count, prevCount) }; // 단순 비율
});
```

각 `count`는 해당 이벤트를 발생시킨 **모든 세션을 독립 집계**한다.
이전 단계를 거치지 않고 직접 진입한 세션(URL 공유, 북마크, 광고 랜딩 등)이 존재하면
다음 단계 세션 수 > 이전 단계 세션 수 → **CVR > 100% 발생**.

### 1.2 재현 시나리오

| 세션 | landing_view | pricing_view | auth_start |
|------|:---:|:---:|:---:|
| s1 | O | O | O |
| s2 | O | O | - |
| s3 (직접 진입) | - | O | O |

```
landing_view:  2 sessions
pricing_view:  3 sessions  ← s3이 landing 없이 pricing 진입
auth_start:    2 sessions

stepCvr(pricing_view) = 3/2 = 150%  ← 버그
stepCvr(auth_start)   = 2/3 = 67%   ← 겉보기엔 정상이지만 분모가 잘못됨
```

### 1.3 영향 범위

- `scripts/funnel-kpi-utils.mjs:102` — 핵심 버그 위치
- `scripts/admin-traffic-snapshot.mjs:204~210` — 보고서 출력 (표기 보강 필요)
- `scripts/funnel-kpi-regression.test.mjs` — 테스트 기댓값 갱신 필요
- `docs/03-design/event-schema-freeze-2026-03-04.md` — 동결 문서 산식 명시 필요
- `components/system-admin/tabs/SystemAdminTrafficTab.tsx` — 프론트엔드 동일 로직 존재 여부 확인 필요

---

## 2. 새 산식 설계

### 2.1 Eligible Sessions 정의

```
eligible(stage[0]) = 전체 고유 세션 집합
eligible(stage[N]) = stage[N-1] 이벤트를 발생시킨 세션 집합

step_cvr(stage[N]) = |{sid : sid ∈ stage[N].sessions ∩ eligible(stage[N])}|
                     ─────────────────────────────────────────────────────
                                  |eligible(stage[N])|
```

- 분모: 이전 단계를 통과한 세션 수 (= eligible)
- 분자: eligible 중 현재 단계까지 진행한 세션 수 (= progressed)
- 결과: 항상 0~100% 보장

### 2.2 예시 재계산

| Stage | Sessions | Eligible | Progressed | Step CVR |
|-------|:---:|:---:|:---:|:---:|
| landing_view | {s1,s2} | {s1,s2} | - | - |
| pricing_view | {s1,s2,s3} | {s1,s2} | {s1,s2} | 100% |
| auth_start | {s1,s3} | {s1,s2} | {s1} | 50% |

- s3은 eligible(auth_start) = {s1,s2}에 없으므로 집계 제외
- step_cvr(pricing_view) = 2/2 = **100%** (버그 수정)
- step_cvr(auth_start) = 1/2 = **50%** (정확)

### 2.3 구현 방향

```js
// 1단계: 각 stage별 세션 Set 구성
const landingSet = new Set(safeRows.filter(r => r.event_type === 'landing_view' && r.session_id).map(r => r.session_id));
// ... 각 stage별 Set

// 2단계: eligible 기반 step_cvr 계산
const stageSets = eventFunnel.map(stage => buildSessionSet(safeRows, stage.key));

const eventFunnelWithCvr = eventFunnel.map((stage, index) => {
  if (index === 0) {
    return { ...stage, eligibleCount: stageSets[0].size, progressedCount: stageSets[0].size, stepCvr: null };
  }
  const eligibleSet = stageSets[index - 1];
  const progressedCount = [...stageSets[index]].filter(sid => eligibleSet.has(sid)).length;
  const stepCvr = toPct(progressedCount, eligibleSet.size);
  return { ...stage, eligibleCount: eligibleSet.size, progressedCount, stepCvr };
});
```

---

## 3. 요구사항

### 3.1 Must

| ID | 요구사항 |
|----|----------|
| R-01 | `funnel-kpi-utils.mjs:102` step_cvr 산식을 eligible sessions 기반으로 교체 |
| R-02 | `eventFunnel` 각 항목에 `eligibleCount`, `progressedCount` 필드 추가 |
| R-03 | 모든 step_cvr가 항상 0~100% 범위 내 유지되도록 보장 |
| R-04 | `funnel-kpi-regression.test.mjs` 기존 기댓값 갱신 및 직접 진입 엣지케이스 테스트 추가 |
| R-05 | `npm run test:funnel` Green |

### 3.2 Should

| ID | 요구사항 |
|----|----------|
| R-06 | `admin-traffic-snapshot.mjs:204` 리포트에 Eligible 컬럼 추가 출력 |
| R-07 | `event-schema-freeze-2026-03-04.md` 새 산식 명시 |

### 3.3 Could

| ID | 요구사항 |
|----|----------|
| R-08 | `SystemAdminTrafficTab.tsx` 프론트엔드 동일 로직 동기화 확인 |

---

## 4. 리스크

| Risk | Impact | Mitigation |
|------|--------|------------|
| 기존 스냅샷과 CVR 수치 불일치 | Low | 새 산식 적용일 changelog에 명시 |
| landing_view 이벤트 미발송 세션의 eligible=0 엣지케이스 | Medium | stage[0]의 fallback(page 필드) 로직 유지 확인 |
| 프론트엔드와 백엔드 산식 불일치 | Medium | R-08: SystemAdminTrafficTab.tsx 동기화 |

---

## 5. 검증 명령

```bash
npm run test:funnel
node scripts/admin-traffic-snapshot.mjs 30 --daily
```

완료 기준:
- 모든 step_cvr: 0 ≤ value ≤ 100
- 테스트: all green
- 리포트: Eligible / Step CVR 양 컬럼 출력

---

## 6. Scope

### In Scope
- [x] 퍼널 CVR 산식 수정 (eligible sessions 기반)
- [x] 회귀 테스트 갱신
- [x] 리포트 표기 보강
- [x] 동결 문서 동기화

### Out of Scope
- 퍼널 단계 자체 변경 (이벤트 추가/제거)
- 히스토리컬 스냅샷 소급 재계산

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial draft | Analytics Lead |
