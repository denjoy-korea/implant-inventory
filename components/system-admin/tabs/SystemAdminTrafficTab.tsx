import React from 'react';

type TrafficRange = 7 | 14 | 30 | 90;

interface PageViewRow {
  page: string;
  session_id: string | null;
  user_id: string | null;
  referrer: string | null;
  event_type: string | null;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

interface SystemAdminTrafficTabProps {
  trafficData: PageViewRow[];
  trafficLoading: boolean;
  trafficRange: TrafficRange;
  onLoadTrafficData: (days: TrafficRange) => void;
  onResetTrafficData: () => void;
}

const SystemAdminTrafficTab: React.FC<SystemAdminTrafficTabProps> = ({
  trafficData,
  trafficLoading,
  trafficRange,
  onLoadTrafficData,
  onResetTrafficData,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 6 * 86400_000).toISOString().slice(0, 10);
  const missingSessionRows = trafficData.filter((row) => !row.session_id).length;
  const todayViews = trafficData.filter((row) => row.created_at.slice(0, 10) === todayStr).length;
  const weekViews = trafficData.filter((row) => row.created_at.slice(0, 10) >= weekAgo).length;

  const allSessions = new Set(trafficData.map((row) => row.session_id).filter(Boolean));
  const convertedSessions = new Set(trafficData.filter((row) => row.user_id).map((row) => row.session_id).filter(Boolean));
  const uniqueSessions = allSessions.size;
  const convertedCount = convertedSessions.size;
  const conversionRate = uniqueSessions > 0 ? Math.round((convertedCount / uniqueSessions) * 100) : 0;

  const dayMap: Record<string, { views: number; converted: number }> = {};
  trafficData.forEach((row) => {
    const date = row.created_at.slice(0, 10);
    if (!dayMap[date]) dayMap[date] = { views: 0, converted: 0 };
    dayMap[date].views++;
    if (row.user_id) dayMap[date].converted++;
  });
  const days: { date: string; views: number; converted: number }[] = [];
  for (let i = trafficRange - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400_000).toISOString().slice(0, 10);
    days.push({ date, views: dayMap[date]?.views ?? 0, converted: dayMap[date]?.converted ?? 0 });
  }
  const maxDay = Math.max(...days.map((day) => day.views), 1);

  const pageMap: Record<string, { views: number; converted: number }> = {};
  trafficData.forEach((row) => {
    if (!pageMap[row.page]) pageMap[row.page] = { views: 0, converted: 0 };
    pageMap[row.page].views++;
    if (row.user_id) pageMap[row.page].converted++;
  });
  const pageRows = Object.entries(pageMap).sort((a, b) => b[1].views - a[1].views);
  const maxPage = Math.max(...pageRows.map((row) => row[1].views), 1);

  const referrerMap: Record<string, number> = {};
  trafficData.forEach((row) => {
    let referrer = '직접 유입';
    if (row.referrer) {
      try {
        referrer = new URL(row.referrer).hostname;
      } catch {
        referrer = row.referrer.slice(0, 30);
      }
    }
    referrerMap[referrer] = (referrerMap[referrer] ?? 0) + 1;
  });
  const referrerRows = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxRef = Math.max(...referrerRows.map((row) => row[1]), 1);

  const sessionPaths: Record<string, string[]> = {};
  [...trafficData]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .forEach((row) => {
      const sessionId = row.session_id;
      if (!sessionId) return;
      if (!sessionPaths[sessionId]) sessionPaths[sessionId] = [];
      const path = sessionPaths[sessionId];
      if (path[path.length - 1] !== row.page) path.push(row.page);
    });
  const pathList = Object.values(sessionPaths);

  const FUNNEL_STEPS = [
    { label: 'landing', pages: ['landing'], color: 'bg-indigo-500' },
    { label: 'analyze', pages: ['analyze'], color: 'bg-sky-500' },
    { label: 'pricing', pages: ['pricing'], color: 'bg-violet-500' },
    { label: 'signup / login', pages: ['signup', 'login'], color: 'bg-emerald-500' },
  ];
  const funnelCounts = FUNNEL_STEPS.map((step) =>
    pathList.filter((path) => step.pages.some((page) => path.includes(page))).length,
  );
  const funnelMax = Math.max(...funnelCounts, 1);

  const pairMap: Record<string, number> = {};
  pathList.forEach((path) => {
    for (let i = 0; i < path.length - 1; i++) {
      const key = `${path[i]} → ${path[i + 1]}`;
      pairMap[key] = (pairMap[key] ?? 0) + 1;
    }
  });
  const pairRows = Object.entries(pairMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxPair = Math.max(...pairRows.map((row) => row[1]), 1);

  const entryMap: Record<string, number> = {};
  const exitMap: Record<string, number> = {};
  pathList.forEach((path) => {
    if (path[0]) entryMap[path[0]] = (entryMap[path[0]] ?? 0) + 1;
    const last = path[path.length - 1];
    if (last) exitMap[last] = (exitMap[last] ?? 0) + 1;
  });
  const entryRows = Object.entries(entryMap).sort((a, b) => b[1] - a[1]);
  const exitRows = Object.entries(exitMap).sort((a, b) => b[1] - a[1]);

  const WAITLIST_STEPS = [
    { key: 'pricing_waitlist_button_click', label: '버튼 클릭', color: 'bg-indigo-500' },
    { key: 'pricing_waitlist_modal_open', label: '모달 오픈', color: 'bg-violet-500' },
    { key: 'pricing_waitlist_submit_start', label: '제출 시작', color: 'bg-amber-500' },
    { key: 'pricing_waitlist_submit_success', label: '제출 성공', color: 'bg-emerald-500' },
  ];

  const uniqueSessionCountByEvent = (eventType: string) =>
    new Set(
      trafficData
        .filter((row) => row.event_type === eventType)
        .map((row) => row.session_id)
        .filter(Boolean),
    ).size;

  const uniqueSessionCountByPage = (page: string) =>
    new Set(
      trafficData
        .filter((row) => row.page === page)
        .map((row) => row.session_id)
        .filter(Boolean),
    ).size;

  const landingViewSessions = uniqueSessionCountByEvent('landing_view') || uniqueSessionCountByPage('landing');
  const pricingViewSessions = uniqueSessionCountByEvent('pricing_view') || uniqueSessionCountByPage('pricing');
  const authStartSessions = uniqueSessionCountByEvent('auth_start');
  const authCompleteSessions = uniqueSessionCountByEvent('auth_complete');
  const analyzeStartSessions = uniqueSessionCountByEvent('analyze_start');
  const analyzeCompleteSessions = uniqueSessionCountByEvent('analyze_complete');
  const contactSubmitSessions = uniqueSessionCountByEvent('contact_submit');
  const waitlistSubmitSessions = uniqueSessionCountByEvent('waitlist_submit');
  const conversionSessions = new Set<string>([
    ...trafficData
      .filter((row) => row.event_type === 'contact_submit' || row.event_type === 'waitlist_submit')
      .map((row) => row.session_id)
      .filter((sid): sid is string => Boolean(sid)),
  ]).size;

  const eventFunnel = [
    { key: 'landing_view', label: 'Landing View', count: landingViewSessions },
    { key: 'pricing_view', label: 'Pricing View', count: pricingViewSessions },
    { key: 'auth_start', label: 'Auth Start', count: authStartSessions },
    { key: 'auth_complete', label: 'Auth Complete', count: authCompleteSessions },
    { key: 'analyze_start', label: 'Analyze Start', count: analyzeStartSessions },
    { key: 'analyze_complete', label: 'Analyze Complete', count: analyzeCompleteSessions },
    { key: 'contact_or_waitlist', label: 'Contact / Waitlist Submit', count: conversionSessions },
  ];

  const toPct = (numerator: number, denominator: number) => (denominator > 0 ? Math.round((numerator / denominator) * 100) : 0);

  const eventRows = [...trafficData].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const firstSeenBySession = new Map<string, number>();
  const authCompletedBySession = new Map<string, number>();
  const analyzeCompletedBySession = new Map<string, number>();
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
    .filter((value): value is number => value !== null && value >= 0);

  const timeToValueMinutes = Array.from(analyzeCompletedBySession.entries())
    .map(([sid, analyzeTs]) => {
      const authTs = authCompletedBySession.get(sid);
      return typeof authTs === 'number' ? (analyzeTs - authTs) / 60000 : null;
    })
    .filter((value): value is number => value !== null && value >= 0);

  const avgMinutes = (values: number[]) => (values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);
  const avgTimeToAuth = avgMinutes(timeToAuthMinutes);
  const avgTimeToValue = avgMinutes(timeToValueMinutes);
  const waitlistEvents = trafficData.filter((row) => row.event_type?.startsWith('pricing_waitlist_'));
  const plans = [...new Set(waitlistEvents.map((row) => String(row.event_data?.plan ?? '알수없음')))].sort();
  const stepCount = (step: string, plan?: string) => (
    new Set(
      waitlistEvents
        .filter((row) => row.event_type === step && (plan ? String(row.event_data?.plan ?? '알수없음') === plan : true))
        .map((row) => row.session_id)
        .filter((sid): sid is string => Boolean(sid)),
    ).size
  );
  const totalWaitlistSteps = WAITLIST_STEPS.map((step) => stepCount(step.key));
  const maxWaitlistStep = Math.max(...totalWaitlistSteps, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {([7, 14, 30, 90] as const).map((daysOption) => (
          <button
            key={daysOption}
            onClick={() => onLoadTrafficData(daysOption)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${trafficRange === daysOption ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            {daysOption}일
          </button>
        ))}
        <button
          onClick={() => onLoadTrafficData(trafficRange)}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:border-slate-300 transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          새로고침
        </button>
        <button
          onClick={onResetTrafficData}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          리셋
        </button>
        {trafficLoading && <span className="text-xs text-slate-400 animate-pulse">불러오는 중...</span>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '오늘 페이지뷰', value: todayViews, color: 'text-indigo-600', sub: null },
          { label: '이번 주 페이지뷰', value: weekViews, color: 'text-emerald-600', sub: null },
          { label: '고유 방문자', value: uniqueSessions, color: 'text-slate-800', sub: `${trafficRange}일 기준` },
          { label: '로그인 전환자', value: convertedCount, color: 'text-purple-600', sub: `전환율 ${conversionRate}%` },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-black ${card.color}`}>{card.value.toLocaleString()}</p>
            {card.sub && <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">방문 → 로그인 전환율</h3>
          <span className="text-lg font-black text-purple-600">{conversionRate}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>방문만 {uniqueSessions - convertedCount}명</span>
          <span>로그인까지 {convertedCount}명</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">정밀 퍼널 KPI (이벤트 기반)</h3>
          <span className="text-[10px] text-slate-400">landing→pricing→auth→analyze→contact/waitlist</span>
        </div>
        <div className="space-y-2.5 mb-5">
          {eventFunnel.map((stage, index) => {
            const prevCount = index > 0 ? eventFunnel[index - 1].count : stage.count;
            const stepCvr = index > 0 ? toPct(stage.count, prevCount) : 100;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="w-40 text-xs font-bold text-slate-600 shrink-0">{stage.label}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-400"
                    style={{ width: `${Math.min(100, Math.max(2, toPct(stage.count, Math.max(eventFunnel[0].count, 1))))}%` }}
                  />
                </div>
                <span className="w-14 text-xs font-bold text-slate-700 text-right shrink-0">{stage.count}</span>
                <span className="w-16 text-[10px] text-slate-500 text-right shrink-0">{index === 0 ? '-' : `${stepCvr}%`}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] text-slate-500 mb-1">Pricing→Auth Start</p>
            <p className="text-lg font-black text-slate-800">{toPct(authStartSessions, pricingViewSessions)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] text-slate-500 mb-1">Time-to-Auth (평균)</p>
            <p className="text-lg font-black text-indigo-700">{avgTimeToAuth}분</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] text-slate-500 mb-1">Time-to-Value (평균)</p>
            <p className="text-lg font-black text-emerald-700">{avgTimeToValue}분</p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-slate-400">
          Contact Submit: {contactSubmitSessions}세션 · Waitlist Submit: {waitlistSubmitSessions}세션
        </p>
        {missingSessionRows > 0 && (
          <p className="mt-1 text-[10px] text-amber-500">
            session_id 누락 이벤트 {missingSessionRows}건은 세션 기반 KPI에서 제외됩니다.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">일별 페이지뷰 / 전환</h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />페이지뷰</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />전환(로그인)</span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-32">
          {days.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-0 group relative" title={`${day.date}\n페이지뷰: ${day.views}\n전환: ${day.converted}`}>
              <div
                className="w-full bg-indigo-300 rounded-t relative overflow-hidden"
                style={{ height: `${Math.round((day.views / maxDay) * 100)}%`, minHeight: day.views > 0 ? '2px' : '0' }}
              >
                {day.converted > 0 && (
                  <div
                    className="absolute bottom-0 left-0 w-full bg-purple-500"
                    style={{ height: `${Math.round((day.converted / day.views) * 100)}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">{days[0]?.date.slice(5)}</span>
          <span className="text-[10px] text-slate-400">{days[days.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">페이지별 방문 / 전환</h3>
        {pageRows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {pageRows.map(([page, { views, converted }]) => {
              const pageRate = views > 0 ? Math.round((converted / views) * 100) : 0;
              return (
                <div key={page} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-bold text-slate-600 shrink-0">{page}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden relative">
                    <div className="bg-indigo-300 h-full rounded-full absolute" style={{ width: `${Math.round((views / maxPage) * 100)}%` }} />
                    <div className="bg-purple-500 h-full rounded-full absolute" style={{ width: `${Math.round((converted / maxPage) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-xs font-bold text-slate-700 text-right shrink-0">{views}</span>
                  <span className="w-12 text-[10px] text-purple-600 text-right shrink-0 font-bold">{converted > 0 ? `전환 ${pageRate}%` : ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-1">전환 퍼널</h3>
        <p className="text-[11px] text-slate-400 mb-4">각 페이지를 방문한 세션 수 (중복 포함)</p>
        {pathList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {FUNNEL_STEPS.map((step, index) => {
              const count = funnelCounts[index];
              const dropOff = index > 0 && funnelCounts[index - 1] > 0
                ? Math.round((1 - count / funnelCounts[index - 1]) * 100)
                : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-xs font-bold text-slate-600 shrink-0">{step.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
                      <div
                        className={`${step.color} h-full rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${Math.round((count / funnelMax) * 100)}%`, minWidth: count > 0 ? '2rem' : '0' }}
                      >
                        {count > 0 && <span className="text-[10px] font-black text-white">{count}</span>}
                      </div>
                    </div>
                    {dropOff !== null && (
                      <span className={`w-16 text-[10px] font-bold shrink-0 text-right ${dropOff > 50 ? 'text-rose-500' : dropOff > 20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        -{dropOff}% 이탈
                      </span>
                    )}
                    {dropOff === null && <span className="w-16 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-1">페이지 이동 경로 Top 8</h3>
        <p className="text-[11px] text-slate-400 mb-4">세션 내 연속으로 이동한 페이지 쌍</p>
        {pairRows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {pairRows.map(([pair, count]) => (
              <div key={pair} className="flex items-center gap-3">
                <span className="w-44 text-xs font-bold text-slate-600 shrink-0 font-mono">{pair}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-sky-400 h-full rounded-full" style={{ width: `${Math.round((count / maxPair) * 100)}%` }} />
                </div>
                <span className="w-8 text-xs font-bold text-slate-700 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-1">진입 페이지</h3>
          <p className="text-[11px] text-slate-400 mb-4">세션 첫 방문 페이지</p>
          <div className="space-y-2">
            {entryRows.map(([page, count]) => (
              <div key={page} className="flex items-center gap-2">
                <span className="w-20 text-xs font-bold text-slate-600 truncate">{page}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${Math.round((count / (entryRows[0]?.[1] ?? 1)) * 100)}%` }} />
                </div>
                <span className="w-6 text-xs font-bold text-slate-700 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-1">이탈 페이지</h3>
          <p className="text-[11px] text-slate-400 mb-4">세션 마지막 방문 페이지</p>
          <div className="space-y-2">
            {exitRows.map(([page, count]) => (
              <div key={page} className="flex items-center gap-2">
                <span className="w-20 text-xs font-bold text-slate-600 truncate">{page}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.round((count / (exitRows[0]?.[1] ?? 1)) * 100)}%` }} />
                </div>
                <span className="w-6 text-xs font-bold text-slate-700 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {waitlistEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-700">품절 대기신청 전환 퍼널</h3>
            <span className="text-[10px] text-slate-400">{trafficRange}일 기준 · 유니크 세션</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-5">버튼 클릭 → 모달 → 제출 시작 → 성공 단계별 이탈</p>

          <div className="space-y-2.5 mb-6">
            {WAITLIST_STEPS.map((step, index) => {
              const count = totalWaitlistSteps[index];
              const prev = totalWaitlistSteps[index - 1] ?? count;
              const dropOff = index > 0 && prev > 0 ? Math.round((1 - count / prev) * 100) : null;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-bold text-slate-600 shrink-0">{step.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`${step.color} h-full rounded-full flex items-center justify-end pr-3 transition-all`}
                      style={{ width: `${Math.max(Math.round((count / maxWaitlistStep) * 100), count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && <span className="text-[11px] font-black text-white">{count}</span>}
                    </div>
                  </div>
                  {dropOff !== null ? (
                    <span className={`w-16 text-[10px] font-bold text-right shrink-0 ${dropOff >= 50 ? 'text-rose-500' : dropOff >= 20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      -{dropOff}% 이탈
                    </span>
                  ) : <span className="w-16 shrink-0" />}
                </div>
              );
            })}
          </div>

          {plans.length > 1 && (
            <>
              <p className="text-[11px] font-bold text-slate-500 mb-3 border-t border-slate-100 pt-4">플랜별 제출 성공</p>
              <div className="space-y-2">
                {plans.map((plan) => {
                  const clicks = stepCount('pricing_waitlist_button_click', plan);
                  const success = stepCount('pricing_waitlist_submit_success', plan);
                  const rate = clicks > 0 ? Math.round((success / clicks) * 100) : 0;
                  return (
                    <div key={plan} className="flex items-center gap-3">
                      <span className="w-14 text-xs font-bold text-slate-600 shrink-0 capitalize">{plan}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 shrink-0 w-20 text-right">
                        {success}/{clicks} ({rate}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">유입 경로 (Referrer)</h3>
        {referrerRows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {referrerRows.map(([referrer, count]) => (
              <div key={referrer} className="flex items-center gap-3">
                <span className="w-32 text-xs font-bold text-slate-600 shrink-0 truncate">{referrer}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.round((count / maxRef) * 100)}%` }} />
                </div>
                <span className="w-8 text-xs font-bold text-slate-700 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAdminTrafficTab;
