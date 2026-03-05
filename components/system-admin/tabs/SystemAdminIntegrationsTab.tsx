import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { decryptPatientInfo } from '../../../services/cryptoUtils';
import NotionModal from '../modals/NotionModal';
import SlackModal, { SlackWebhook } from '../modals/SlackModal';
import SolapiModal from '../modals/SolapiModal';

// ── 메인 탭 (연동 카드 그리드) ────────────────────────────────────────────
export default function SystemAdminIntegrationsTab() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [notionConnected,  setNotionConnected]  = useState<boolean | null>(null);
  const [slackCount,       setSlackCount]       = useState<number | null>(null);
  const [solapiConnected,  setSolapiConnected]  = useState<boolean | null>(null);

  useEffect(() => {
    // 연결 상태만 빠르게 조회 (카드 배지 표시용)
    supabase
      .from('system_integrations')
      .select('key, value')
      .in('key', ['notion_databases', 'notion_api_token', 'notion_consultation_db_id', 'slack_webhooks', 'solapi_credentials'])
      .then(async ({ data }) => {
        const keys = data?.map(r => r.key) ?? [];
        setNotionConnected(
          keys.includes('notion_databases') ||
          (keys.includes('notion_api_token') && keys.includes('notion_consultation_db_id'))
        );
        const slackRow = data?.find(r => r.key === 'slack_webhooks');
        if (slackRow) {
          try {
            const decrypted = await decryptPatientInfo(slackRow.value).catch(() => '[]');
            const list: SlackWebhook[] = JSON.parse(decrypted);
            setSlackCount(list.length);
          } catch { setSlackCount(0); }
        } else {
          setSlackCount(0);
        }
        setSolapiConnected(keys.includes('solapi_credentials'));
      });
  }, [openModal]); // 모달 닫힐 때마다 상태 새로고침

  const integrations = [
    {
      id: 'notion',
      name: 'Notion',
      description: '상담 신청을 노션 DB에 자동 저장',
      connected: notionConnected,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="currentColor">
            <path d="M6.55 6.3c3.18 2.57 4.37 2.37 10.34 1.98l56.2-3.38c1.19 0 .2-.99-.39-1.18L63.08.56C61.5.17 59.72 0 57.95 0L10.71 3.78C8.34 3.98 6 5.16 6.55 6.3zm3.58 13.09V73.8c0 3.18.79 4.77 3.78 5.16l62.77 3.58c2.97.39 3.97-.79 3.97-3.38V25.76c0-2.57-.99-3.97-3.18-3.77L13.92 19.01c-2.18.2-3.78 1.39-3.78 4.38zm59.97 3.17c.39 1.79 0 3.58-1.79 3.78l-2.97.59v43.64c-2.57 1.39-5.16 2.18-7.14 2.18-3.38 0-4.17-1-6.75-4.17L34.67 36.51v42.45l8.53 1.79s0 3.58-4.97 3.58L24.33 85.5c-.39-1-.2-3.38 1.39-3.77l3.58-.99V31.94l-4.97-.39c-.39-1.79.59-4.37 3.38-4.57l13.49-.99L56.76 51.8V11.13l-7.14-.79c-.39-2.18 1-3.77 3.38-3.97l13.49-.99.2.39c0 0-.99.79-1.39 2.97l.79 4.57z"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'slack',
      name: 'Slack',
      description: '웹훅 채널을 등록하고 알림을 자동화하세요',
      connected: slackCount !== null ? slackCount > 0 : null,
      channelCount: slackCount,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'solapi',
      name: '솔라피',
      description: 'SMS / 알림톡 발송 API 키를 안전하게 저장',
      connected: solapiConnected,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
          </svg>
        </div>
      ),
    },
    // 향후 추가될 연동 서비스들
    {
      id: 'coming_soon_1',
      name: 'Google Calendar',
      description: '상담 일정을 구글 캘린더에 자동 등록',
      connected: false,
      comingSoon: true,
      logo: (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">연동 설정</h2>
        <p className="text-xs text-slate-400 mt-0.5">외부 서비스와 연결하여 업무를 자동화하세요.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {integrations.map(item => (
          <button
            key={item.id}
            onClick={() => !item.comingSoon && setOpenModal(item.id)}
            disabled={item.comingSoon}
            className={`
              text-left bg-white rounded-2xl border p-4 transition-all
              ${item.comingSoon
                ? 'border-slate-100 opacity-60 cursor-not-allowed'
                : 'border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {item.logo}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-800">{item.name}</span>
                  {item.comingSoon ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">준비 중</span>
                  ) : (item.channelCount !== undefined && item.channelCount !== null) ? (
                    item.channelCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{item.channelCount}개 채널
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />미연결
                      </span>
                    )
                  ) : item.connected === true ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />연결됨
                    </span>
                  ) : item.connected === false ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />미연결
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
            {!item.comingSoon && (
              <div className="flex justify-end mt-3">
                <span className="text-[11px] font-bold text-indigo-500 flex items-center gap-1">
                  설정
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {openModal === 'notion' && (
        <NotionModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'slack' && (
        <SlackModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'solapi' && (
        <SolapiModal onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
