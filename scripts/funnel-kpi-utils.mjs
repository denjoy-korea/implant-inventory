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

function avgMinutes(values) {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export function computeTrafficKpiSnapshot(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const missingSessionRows = safeRows.filter((row) => !row.session_id).length;

  const uniqueSessions = getUniqueSessionCount(safeRows, () => true);
  const convertedSessions = getUniqueSessionCount(safeRows, (row) => Boolean(row.user_id));
  const conversionRate = toPct(convertedSessions, uniqueSessions);

  const uniqueSessionCountByEvent = (eventType) =>
    getUniqueSessionCount(safeRows, (row) => row.event_type === eventType);

  const uniqueSessionCountByPage = (page) =>
    getUniqueSessionCount(safeRows, (row) => row.page === page);

  const landingViewSessions = uniqueSessionCountByEvent('landing_view') || uniqueSessionCountByPage('landing');
  const pricingViewSessions = uniqueSessionCountByEvent('pricing_view') || uniqueSessionCountByPage('pricing');
  const authStartSessions = uniqueSessionCountByEvent('auth_start');
  const authCompleteSessions = uniqueSessionCountByEvent('auth_complete');
  const analyzeStartSessions = uniqueSessionCountByEvent('analyze_start');
  const analyzeCompleteSessions = uniqueSessionCountByEvent('analyze_complete');
  const contactSubmitSessions = uniqueSessionCountByEvent('contact_submit');
  const waitlistSubmitSessions = uniqueSessionCountByEvent('waitlist_submit');

  const conversionSessions = getUniqueSessionCount(
    safeRows,
    (row) => row.event_type === 'contact_submit' || row.event_type === 'waitlist_submit',
  );

  const eventFunnel = [
    { key: 'landing_view', label: 'Landing View', count: landingViewSessions },
    { key: 'pricing_view', label: 'Pricing View', count: pricingViewSessions },
    { key: 'auth_start', label: 'Auth Start', count: authStartSessions },
    { key: 'auth_complete', label: 'Auth Complete', count: authCompleteSessions },
    { key: 'analyze_start', label: 'Analyze Start', count: analyzeStartSessions },
    { key: 'analyze_complete', label: 'Analyze Complete', count: analyzeCompleteSessions },
    { key: 'contact_or_waitlist', label: 'Contact / Waitlist Submit', count: conversionSessions },
  ];

  const eventFunnelWithCvr = eventFunnel.map((stage, index) => {
    if (index === 0) return { ...stage, stepCvr: null };
    const prevCount = eventFunnel[index - 1].count;
    return { ...stage, stepCvr: toPct(stage.count, prevCount) };
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
    avgTimeToAuthMinutes: avgMinutes(timeToAuthMinutes),
    avgTimeToValueMinutes: avgMinutes(timeToValueMinutes),
    eventFunnel: eventFunnelWithCvr,
    waitlistStepCounts,
  };
}

export { WAITLIST_STEPS };
