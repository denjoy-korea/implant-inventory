import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeTrafficKpiSnapshot } from './funnel-kpi-utils.mjs';

function row(overrides = {}) {
  return {
    page: 'landing',
    session_id: 's-default',
    user_id: null,
    referrer: null,
    event_type: null,
    event_data: null,
    created_at: '2026-02-22T00:00:00.000Z',
    ...overrides,
  };
}

test('event funnel uses unique session counts and includes analyze_start stage', () => {
  const rows = [
    row({ session_id: 's1', event_type: 'landing_view', created_at: '2026-02-22T00:00:00.000Z' }),
    row({ page: 'pricing', session_id: 's1', event_type: 'pricing_view', created_at: '2026-02-22T00:01:00.000Z' }),
    row({ page: 'signup', session_id: 's1', event_type: 'auth_start', created_at: '2026-02-22T00:02:00.000Z' }),
    row({ page: 'signup', session_id: 's1', event_type: 'auth_complete', created_at: '2026-02-22T00:03:00.000Z', user_id: 'u1' }),
    row({ page: 'analyze', session_id: 's1', event_type: 'analyze_start', created_at: '2026-02-22T00:04:00.000Z', user_id: 'u1' }),
    row({ page: 'analyze', session_id: 's1', event_type: 'analyze_complete', created_at: '2026-02-22T00:06:00.000Z', user_id: 'u1' }),
    row({ page: 'contact', session_id: 's1', event_type: 'contact_submit', created_at: '2026-02-22T00:07:00.000Z', user_id: 'u1' }),
    row({ page: 'pricing', session_id: 's1', event_type: 'waitlist_submit', created_at: '2026-02-22T00:08:00.000Z', user_id: 'u1' }),
    row({ session_id: 's2', event_type: 'landing_view', created_at: '2026-02-22T00:00:00.000Z' }),
    row({ page: 'pricing', session_id: 's2', event_type: 'pricing_view', created_at: '2026-02-22T00:01:00.000Z' }),
    row({ page: 'signup', session_id: 's2', event_type: 'auth_start', created_at: '2026-02-22T00:02:00.000Z' }),
    row({ page: 'signup', session_id: 's2', event_type: 'auth_start', created_at: '2026-02-22T00:02:30.000Z' }), // duplicate event in same session
    row({ session_id: null, event_type: 'contact_submit', created_at: '2026-02-22T01:00:00.000Z' }), // should be excluded
  ];

  const snapshot = computeTrafficKpiSnapshot(rows);

  assert.equal(snapshot.uniqueSessions, 2);
  assert.equal(snapshot.convertedSessions, 1);
  assert.equal(snapshot.conversionRate, 50);
  assert.equal(snapshot.missingSessionRows, 1);

  assert.deepEqual(
    snapshot.eventFunnel.map((stage) => [stage.key, stage.count]),
    [
      ['landing_view', 2],
      ['pricing_view', 2],
      ['auth_start', 2],
      ['auth_complete', 1],
      ['analyze_start', 1],
      ['analyze_complete', 1],
      ['contact_or_waitlist', 1],
    ],
  );

  assert.deepEqual(
    snapshot.eventFunnel.map((stage) => stage.stepCvr),
    [null, 100, 100, 50, 100, 100, 100],
  );
  assert.equal(snapshot.contactSubmitSessions, 1);
  assert.equal(snapshot.waitlistSubmitSessions, 1);
  assert.equal(snapshot.conversionSessions, 1);
  assert.equal(snapshot.avgTimeToAuthMinutes, 3);
  assert.equal(snapshot.avgTimeToValueMinutes, 3);
});

test('landing/pricing fallback uses page field when *_view event is absent', () => {
  const rows = [
    row({ page: 'landing', session_id: 'legacy-1', event_type: null }),
    row({ page: 'landing', session_id: 'legacy-2', event_type: null }),
    row({ page: 'pricing', session_id: 'legacy-1', event_type: null }),
  ];

  const snapshot = computeTrafficKpiSnapshot(rows);
  const stages = Object.fromEntries(snapshot.eventFunnel.map((stage) => [stage.key, stage.count]));

  assert.equal(stages.landing_view, 2);
  assert.equal(stages.pricing_view, 1);
});

test('waitlist step counts are session-based and ignore rows without session_id', () => {
  const rows = [
    row({ page: 'pricing', session_id: 'w1', event_type: 'pricing_waitlist_button_click' }),
    row({ page: 'pricing', session_id: 'w1', event_type: 'pricing_waitlist_modal_open' }),
    row({ page: 'pricing', session_id: 'w1', event_type: 'pricing_waitlist_submit_start' }),
    row({ page: 'pricing', session_id: 'w1', event_type: 'pricing_waitlist_submit_success' }),
    row({ page: 'pricing', session_id: 'w2', event_type: 'pricing_waitlist_button_click' }),
    row({ page: 'pricing', session_id: null, event_type: 'pricing_waitlist_submit_success' }), // must not inflate success
  ];

  const snapshot = computeTrafficKpiSnapshot(rows);
  const steps = Object.fromEntries(snapshot.waitlistStepCounts.map((step) => [step.step, step]));

  assert.equal(steps.pricing_waitlist_button_click.count, 2);
  assert.equal(steps.pricing_waitlist_modal_open.count, 1);
  assert.equal(steps.pricing_waitlist_submit_start.count, 1);
  assert.equal(steps.pricing_waitlist_submit_success.count, 1);
  assert.equal(steps.pricing_waitlist_modal_open.dropOffPct, 50);
});
