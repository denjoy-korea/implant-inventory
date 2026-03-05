/**
 * Shared KPI calculations for SystemAdmin traffic funnel validation scripts.
 * Mirrors the current session-based logic used in SystemAdminTrafficTab.
 */

const WAITLIST_STEPS = [
  'pricing_waitlist_button_click',
  'pricing_waitlist_modal_open',
  'pricing_waitlist_submit_start',
  'pricing_waitlist_submit_success',
];

function toPct(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function getUniqueSessionCount(rows, predicate) {
  return new Set(
    rows
      .filter(predicate)
      .map((row) => row.session_id)
      .filter(Boolean),
  ).size;
}

function buildSessionSet(rows, eventType, pageFallback) {
  const byEvent = new Set(
    rows.filter(r => r.event_type === eventType && r.session_id).map(r => r.session_id)
  );
  if (byEvent.size > 0 || !pageFallback) return byEvent;
  return new Set(
    rows.filter(r => r.page === pageFallback && r.session_id).map(r => r.session_id)
  );
}

function avgMinutes(values) {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function isMobileRow(row) {
  const data = row?.event_data;
  if (!data || typeof data !== 'object') return false;
  const mobile = data.is_mobile;
  return mobile === true || mobile === 1 || mobile === 'true';
}

export function computeTrafficKpiSnapshot(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const missingSessionRows = safeRows.filter((row) => !row.session_id).length;

  const uniqueSessions = getUniqueSessionCount(safeRows, () => true);
  const convertedSessions = getUniqueSessionCount(safeRows, (row) => Boolean(row.user_id));
  const conversionRate = toPct(convertedSessions, uniqueSessions);

  const uniqueSessionCountByEvent = (eventType) =>
    getUniqueSessionCount(safeRows, (row) => row.event_type === eventType);

  const contactSubmitSessions = uniqueSessionCountByEvent('contact_submit');
  const waitlistSubmitSessions = uniqueSessionCountByEvent('waitlist_submit');
  const paymentModalOpenSessions = uniqueSessionCountByEvent('pricing_payment_modal_open');
  const paymentRequestSuccessSessions = uniqueSessionCountByEvent('pricing_payment_request_success');
  const paymentRequestErrorSessions = uniqueSessionCountByEvent('pricing_payment_request_error');
  const paymentModalCompletionRate = toPct(paymentRequestSuccessSessions, paymentModalOpenSessions);

  const conversionSessions = getUniqueSessionCount(
    safeRows,
    (row) => row.event_type === 'contact_submit' || row.event_type === 'waitlist_submit',
  );

  const mobileLandingSessions = getUniqueSessionCount(
    safeRows,
    (row) => isMobileRow(row) && (row.event_type === 'landing_view' || row.page === 'landing'),
  );
  const mobileEngagedSessions = getUniqueSessionCount(
    safeRows,
    (row) =>
      isMobileRow(row)
      && (
        row.event_type === 'pricing_view'
        || row.event_type === 'auth_start'
        || row.event_type === 'contact_submit'
        || row.event_type === 'waitlist_submit'
        || row.event_type === 'analyze_start'
      ),
  );
  const mobileDropoffRate = mobileLandingSessions > 0
    ? Math.max(0, 100 - toPct(mobileEngagedSessions, mobileLandingSessions))
    : 0;

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
    { key: 'landing_view',        label: 'Landing View' },
    { key: 'pricing_view',        label: 'Pricing View' },
    { key: 'auth_start',          label: 'Auth Start' },
    { key: 'auth_complete',       label: 'Auth Complete' },
    { key: 'analyze_start',       label: 'Analyze Start' },
    { key: 'analyze_complete',    label: 'Analyze Complete' },
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

  const eventRows = [...safeRows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const firstSeenBySession = new Map();
  const authCompletedBySession = new Map();
  const analyzeCompletedBySession = new Map();

  eventRows.forEach((row) => {
    const sid = row.session_id;
    if (!sid) return;

    const ts = Date.parse(row.created_at);
    if (Number.isNaN(ts)) return;

    if (!firstSeenBySession.has(sid)) firstSeenBySession.set(sid, ts);
    if (row.event_type === 'auth_complete' && !authCompletedBySession.has(sid)) authCompletedBySession.set(sid, ts);
    if (row.event_type === 'analyze_complete' && !analyzeCompletedBySession.has(sid)) analyzeCompletedBySession.set(sid, ts);
  });

  const timeToAuthMinutes = Array.from(authCompletedBySession.entries())
    .map(([sid, authTs]) => {
      const firstTs = firstSeenBySession.get(sid);
      return typeof firstTs === 'number' ? (authTs - firstTs) / 60000 : null;
    })
    .filter((value) => typeof value === 'number' && value >= 0);

  const timeToValueMinutes = Array.from(analyzeCompletedBySession.entries())
    .map(([sid, analyzeTs]) => {
      const authTs = authCompletedBySession.get(sid);
      return typeof authTs === 'number' ? (analyzeTs - authTs) / 60000 : null;
    })
    .filter((value) => typeof value === 'number' && value >= 0);

  const waitlistEvents = safeRows.filter((row) => String(row.event_type || '').startsWith('pricing_waitlist_'));
  const stepCount = (step) =>
    getUniqueSessionCount(waitlistEvents, (row) => row.event_type === step);

  const waitlistStepCounts = WAITLIST_STEPS.map((step, index) => {
    const count = stepCount(step);
    const prevCount = index > 0 ? stepCount(WAITLIST_STEPS[index - 1]) : count;
    const dropOffPct = index > 0 ? Math.max(0, 100 - toPct(count, prevCount)) : null;
    return { step, count, dropOffPct };
  });

  return {
    totalRows: safeRows.length,
    missingSessionRows,
    uniqueSessions,
    convertedSessions,
    conversionRate,
    contactSubmitSessions,
    waitlistSubmitSessions,
    conversionSessions,
    paymentModalOpenSessions,
    paymentRequestSuccessSessions,
    paymentRequestErrorSessions,
    paymentModalCompletionRate,
    mobileLandingSessions,
    mobileEngagedSessions,
    mobileDropoffRate,
    avgTimeToAuthMinutes: avgMinutes(timeToAuthMinutes),
    avgTimeToValueMinutes: avgMinutes(timeToValueMinutes),
    eventFunnel: eventFunnelWithCvr,
    waitlistStepCounts,
  };
}

export { WAITLIST_STEPS };
