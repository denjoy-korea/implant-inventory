# funnel-cvr-fix Design Document

> **Summary**: 퍼널 Step CVR > 100% 버그 수정 상세 구현 설계.
> 4개 파일 변경: funnel-kpi-utils.mjs (핵심 로직), SystemAdminTrafficTab.tsx (프론트),
> admin-traffic-snapshot.mjs (리포트), event-schema-freeze-2026-03-04.md (문서).
>
> **Author**: Analytics Lead
> **Created**: 2026-03-05
> **Status**: Draft

---

## 0. 사전 진단

| 파일 | 버그 위치 | 유형 |
|------|-----------|------|
| `scripts/funnel-kpi-utils.mjs:102-106` | `stepCvr = stage.count / prevCount` 단순 비율 | Critical |
| `components/system-admin/tabs/SystemAdminTrafficTab.tsx:298-299` | 동일 단순 비율 (프론트 독자 구현) | Critical |
| `scripts/funnel-kpi-regression.test.mjs` | 직접 진입 시나리오 테스트 없음 | Gap |
| `scripts/admin-traffic-snapshot.mjs:206-209` | Eligible 컬럼 미표시 | Should |
| `docs/03-design/event-schema-freeze-2026-03-04.md:138-139` | 구 산식 명시 | Should |

**R-08 격상**: 프론트엔드(`SystemAdminTrafficTab.tsx:298-299`)도 동일 버그 확인 → Must로 변경.

---

## 1. 변경 파일 목록

```
scripts/funnel-kpi-utils.mjs                              ← R-01, R-02, R-03 (핵심)
scripts/funnel-kpi-regression.test.mjs                    ← R-04, R-05
scripts/admin-traffic-snapshot.mjs                        ← R-06
components/system-admin/tabs/SystemAdminTrafficTab.tsx    ← R-08 (Must로 격상)
docs/03-design/event-schema-freeze-2026-03-04.md          ← R-07
```

---

## 2. 상세 변경 설계

### 2-A. `funnel-kpi-utils.mjs` — eligible sessions 기반 산식

#### 추가: `buildSessionSet` 헬퍼 함수 (L17 이후 삽입)

```js
/**
 * 특정 이벤트 타입의 세션 Set을 반환한다.
 * pageFallback 제공 시, 이벤트 기반 결과가 0이면 page 필드 기준으로 폴백.
 */
function buildSessionSet(rows, eventType, pageFallback) {
  const byEvent = new Set(
    rows.filter(r => r.event_type === eventType && r.session_id).map(r => r.session_id)
  );
  if (byEvent.size > 0 || !pageFallback) return byEvent;
  return new Set(
    rows.filter(r => r.page === pageFallback && r.session_id).map(r => r.session_id)
  );
}
```

#### 수정: `eventFunnel` 구성 및 `eventFunnelWithCvr` 계산 (L92~L106)

```js
// 현재 (버그): count는 독립 집계된 숫자
const eventFunnel = [
  { key: 'landing_view',         label: 'Landing View',           count: landingViewSessions },
  { key: 'pricing_view',         label: 'Pricing View',           count: pricingViewSessions },
  // ...
];
const eventFunnelWithCvr = eventFunnel.map((stage, index) => {
  if (index === 0) return { ...stage, stepCvr: null };
  const prevCount = eventFunnel[index - 1].count;       // ← 단순 비율 (버그)
  return { ...stage, stepCvr: toPct(stage.count, prevCount) };
});

// 변경 후 (수정): Set 기반 eligible intersection
const stageSets = [
  buildSessionSet(safeRows, 'landing_view', 'landing'),
  buildSessionSet(safeRows, 'pricing_view', 'pricing'),
  buildSessionSet(safeRows, 'auth_start'),
  buildSessionSet(safeRows, 'auth_complete'),
  buildSessionSet(safeRows, 'analyze_start'),
  buildSessionSet(safeRows, 'analyze_complete'),
  new Set(
    safeRows
      .filter(r => (r.event_type === 'contact_submit' || r.event_type === 'waitlist_submit') && r.session_id)
      .map(r => r.session_id)
  ),
];

const eventFunnelStages = [
  { key: 'landing_view',      label: 'Landing View' },
  { key: 'pricing_view',      label: 'Pricing View' },
  { key: 'auth_start',        label: 'Auth Start' },
  { key: 'auth_complete',     label: 'Auth Complete' },
  { key: 'analyze_start',     label: 'Analyze Start' },
  { key: 'analyze_complete',  label: 'Analyze Complete' },
  { key: 'contact_or_waitlist', label: 'Contact / Waitlist Submit' },
];

const eventFunnelWithCvr = eventFunnelStages.map((stage, index) => {
  const sessionSet = stageSets[index];
  const count = sessionSet.size;
  if (index === 0) {
    return { ...stage, count, eligibleCount: count, progressedCount: count, stepCvr: null };
  }
  const eligibleSet = stageSets[index - 1];
  const progressedCount = [...sessionSet].filter(sid => eligibleSet.has(sid)).length;
  const stepCvr = toPct(progressedCount, eligibleSet.size);
  return { ...stage, count, eligibleCount: eligibleSet.size, progressedCount, stepCvr };
});
```

**주의**: `landingViewSessions`, `pricingViewSessions` 등의 기존 변수는 다른 반환 필드
(`mobileLandingSessions` 등)에서 여전히 사용되므로 삭제하지 않는다.
`eventFunnel`의 `count`는 `stageSets[index].size`로 대체된다.

#### 반환 타입 변경 없음

기존 `eventFunnel` 배열의 각 항목에 `eligibleCount`, `progressedCount` 필드가 추가될 뿐,
기존 `count`, `stepCvr`, `key`, `label` 필드는 유지된다. 하위 호환성 보장.

---

### 2-B. `funnel-kpi-regression.test.mjs` — 테스트 갱신

#### 기존 테스트 기댓값 확인 (변경 불필요)

첫 번째 테스트의 데이터는 s1(전 단계 통과), s2(auth_start까지)로 "직접 진입 세션 없음".
→ eligible 기반으로 계산해도 stepCvr 결과 동일: `[null, 100, 100, 50, 100, 100, 100]`

단, `eligibleCount`와 `progressedCount` 필드 추가됐으므로 기존 assert는 그대로 통과.

#### 추가: 직접 진입 엣지케이스 테스트

```js
test('direct-entry sessions do not inflate step CVR above 100%', () => {
  const rows = [
    // s1: landing → pricing → auth_start
    row({ session_id: 's1', event_type: 'landing_view' }),
    row({ session_id: 's1', event_type: 'pricing_view' }),
    row({ session_id: 's1', event_type: 'auth_start' }),
    // s2: landing → pricing (auth_start까지 안 감)
    row({ session_id: 's2', event_type: 'landing_view' }),
    row({ session_id: 's2', event_type: 'pricing_view' }),
    // s3: 직접 pricing_view 진입 (landing 없음)
    row({ session_id: 's3', event_type: 'pricing_view' }),
    row({ session_id: 's3', event_type: 'auth_start' }),
  ];

  const snapshot = computeTrafficKpiSnapshot(rows);
  const funnel = Object.fromEntries(snapshot.eventFunnel.map(s => [s.key, s]));

  // landing_view: {s1, s2} = 2
  assert.equal(funnel.landing_view.count, 2);
  assert.equal(funnel.landing_view.stepCvr, null);

  // pricing_view: {s1, s2, s3} = 3 (직접 진입 s3 포함)
  // eligible = landing_view 세션 {s1, s2} = 2
  // progressed = {s1, s2, s3} ∩ {s1, s2} = {s1, s2} = 2
  assert.equal(funnel.pricing_view.count, 3);
  assert.equal(funnel.pricing_view.eligibleCount, 2);
  assert.equal(funnel.pricing_view.progressedCount, 2);
  assert.equal(funnel.pricing_view.stepCvr, 100); // NOT 150%

  // auth_start: {s1, s3} = 2
  // eligible = stageSets[index-1] = pricing_view 세션 {s1, s2, s3} = 3
  // progressed = {s1, s3} ∩ {s1, s2, s3} = {s1, s3} = 2
  assert.equal(funnel.auth_start.count, 2);
  assert.equal(funnel.auth_start.eligibleCount, 3);
  assert.equal(funnel.auth_start.progressedCount, 2);
  assert.equal(funnel.auth_start.stepCvr, 67); // Math.round(2/3*100)
});
```

---

### 2-C. `admin-traffic-snapshot.mjs:204~210` — Eligible 컬럼 추가

```js
// 현재
lines.push('| Stage | Sessions | Step CVR |');
lines.push('|---|---:|---:|');
snapshot.eventFunnel.forEach((stage) => {
  lines.push(`| ${stage.label} | ${stage.count} | ${stage.stepCvr === null ? '-' : `${stage.stepCvr}%`} |`);
});

// 변경 후
lines.push('| Stage | Sessions | Eligible | Step CVR |');
lines.push('|---|---:|---:|---:|');
snapshot.eventFunnel.forEach((stage) => {
  const eligible = stage.eligibleCount !== undefined && stage.stepCvr !== null
    ? String(stage.eligibleCount)
    : '-';
  lines.push(`| ${stage.label} | ${stage.count} | ${eligible} | ${stage.stepCvr === null ? '-' : `${stage.stepCvr}%`} |`);
});
```

---

### 2-D. `SystemAdminTrafficTab.tsx:297~311` — 프론트엔드 동기화 (R-08 Must)

```tsx
// 현재 (버그): L298-299
{eventFunnel.map((stage, index) => {
  const prevCount = index > 0 ? eventFunnel[index - 1].count : stage.count;
  const stepCvr = index > 0 ? toPct(stage.count, prevCount) : 100;

// 변경 후: eligible sessions 기반 (스크립트와 동일 로직)
// L174 eventFunnel 배열 선언 이전에 stageSets 구성 추가
const stageSets: Set<string>[] = [
  new Set(trafficData.filter(r => r.event_type === 'landing_view' || r.page === 'landing').map(r => r.session_id).filter(Boolean) as string[]),
  new Set(trafficData.filter(r => r.event_type === 'pricing_view' || r.page === 'pricing').map(r => r.session_id).filter(Boolean) as string[]),
  new Set(trafficData.filter(r => r.event_type === 'auth_start').map(r => r.session_id).filter(Boolean) as string[]),
  new Set(trafficData.filter(r => r.event_type === 'auth_complete').map(r => r.session_id).filter(Boolean) as string[]),
  new Set(trafficData.filter(r => r.event_type === 'analyze_start').map(r => r.session_id).filter(Boolean) as string[]),
  new Set(trafficData.filter(r => r.event_type === 'analyze_complete').map(r => r.session_id).filter(Boolean) as string[]),
  new Set(trafficData.filter(r => r.event_type === 'contact_submit' || r.event_type === 'waitlist_submit').map(r => r.session_id).filter(Boolean) as string[]),
];

// L297~311 렌더링 로직 수정
{eventFunnel.map((stage, index) => {
  const eligibleSet = index > 0 ? stageSets[index - 1] : stageSets[0];
  const stageSet = stageSets[index];
  const progressedCount = index > 0
    ? [...stageSet].filter(sid => eligibleSet.has(sid)).length
    : stageSet.size;
  const stepCvr = index > 0 ? toPct(progressedCount, eligibleSet.size) : 100;
```

**주의**: `landingViewSessions`, `pricingViewSessions` 등 기존 변수는 다른 지표에서 사용 중 — 삭제 금지.
`stageSets[0]`은 landing_view 이벤트 OR page=landing 양쪽 모두 포함 (fallback 유지).

---

### 2-E. `docs/03-design/event-schema-freeze-2026-03-04.md:136~140` — 산식 명시

```markdown
// 현재 (L136~140)
### 4.2 단계별 전환율(CVR) 계산
CVR(n→n+1) = COUNT(DISTINCT session_id where event=stage_n+1)
             / COUNT(DISTINCT session_id where event=stage_n) × 100

// 변경 후
### 4.2 단계별 전환율(CVR) 계산 — v2 (eligible sessions 기반)

eligible(stage[0]) = 전체 고유 세션 집합
eligible(stage[N]) = stage[N-1] 이벤트를 발생시킨 세션 집합

step_cvr(stage[N]) = |stage[N].sessions ∩ eligible(stage[N])|
                     ──────────────────────────────────────────  × 100
                              |eligible(stage[N])|

// 변경 이유: 직접 URL 진입 등 이전 단계를 거치지 않은 세션이 존재할 경우
// 단순 비율(stage_n+1 / stage_n) 산식은 CVR > 100%를 발생시킴.
// eligible intersection 방식으로 항상 0~100% 보장.
// 적용일: 2026-03-05, 파일: funnel-kpi-utils.mjs + SystemAdminTrafficTab.tsx
```

---

## 3. 구현 순서

```
Step 1: funnel-kpi-utils.mjs — buildSessionSet 헬퍼 + eligible 로직
Step 2: funnel-kpi-regression.test.mjs — 직접 진입 테스트 추가
Step 3: npm run test:funnel  (Green 확인)
Step 4: admin-traffic-snapshot.mjs — Eligible 컬럼
Step 5: SystemAdminTrafficTab.tsx — 프론트 동기화
Step 6: event-schema-freeze-2026-03-04.md — 산식 명시
Step 7: node scripts/admin-traffic-snapshot.mjs 30 --daily  (검증)
```

---

## 4. 기존 반환 인터페이스 하위 호환성

| 필드 | 변경 | 영향 |
|------|------|------|
| `count` | Set.size로 대체 (값 동일) | 없음 |
| `stepCvr` | 산식 변경 (값 달라질 수 있음) | 의도된 수정 |
| `eligibleCount` | 신규 추가 | 없음 (추가만) |
| `progressedCount` | 신규 추가 | 없음 (추가만) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial design | Analytics Lead |
