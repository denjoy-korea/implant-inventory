import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  patchSupportMessage,
  replaceSupportMessage,
  supportChatService,
  SupportDisplayMessage,
  SupportMessage,
  SupportThread,
  upsertSupportMessage,
} from '../../services/supportChatService';
import {
  CLINIC_ROLE_LABELS,
  PLAN_NAMES,
  PLAN_ORDER,
  type PlanType,
  type User,
} from '../../types';

interface SupportChatWidgetProps {
  user: User;
  hospitalName: string;
  plan: PlanType;
  liftForBottomNav?: boolean;
  onOpenContactForm?: () => void;
  openRequestToken?: number;
}

const SUPPORT_OPERATING_HOURS = [
  { label: '운영 시간', value: '평일 09시 - 18시' },
  { label: '점심 시간', value: '12시 - 13시' },
];

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createOptimisticMessage(user: User, threadId: string, body: string): SupportDisplayMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    thread_id: threadId,
    sender_id: user.id,
    sender_kind: 'member',
    sender_name: user.name,
    body,
    created_at: new Date().toISOString(),
    pending: true,
  };
}

interface SupportNoticeCardProps {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  tone?: 'teal' | 'slate' | 'amber' | 'emerald';
}

const NOTICE_CARD_TONES: Record<NonNullable<SupportNoticeCardProps['tone']>, string> = {
  teal: 'border-teal-400/20 bg-teal-400/8 text-teal-50',
  slate: 'border-white/10 bg-white/[0.045] text-slate-100',
  amber: 'border-amber-300/20 bg-amber-300/10 text-amber-50',
  emerald: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-50',
};

function SupportNoticeCard({
  icon,
  title,
  body,
  tone = 'slate',
}: SupportNoticeCardProps) {
  return (
    <section className={`rounded-[1.35rem] border px-4 py-3 ${NOTICE_CARD_TONES[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/10">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-black leading-5 text-white">{title}</p>
          <div className="mt-1.5 text-[12px] leading-5 text-slate-300">
            {body}
          </div>
        </div>
      </div>
    </section>
  );
}

const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({
  user,
  hospitalName,
  plan,
  liftForBottomNav = false,
  onOpenContactForm,
  openRequestToken = 0,
}) => {
  const isRealtimeEnabled = PLAN_ORDER[plan] >= PLAN_ORDER.business;
  const [isOpen, setIsOpen] = useState(false);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportDisplayMessage[]>([]);
  const [threadBooting, setThreadBooting] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isComposingRef = useRef(false);
  const lastResetAtRef = useRef<string | null>(null);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = isRealtimeEnabled ? (thread?.member_unread_count ?? 0) : 0;
  const planLabel = PLAN_NAMES[plan] ?? plan;
  const operatorLabel = user.clinicRole ? CLINIC_ROLE_LABELS[user.clinicRole] : null;
  const memberHasSentMessage = useMemo(
    () => messages.some((message) => message.sender_kind === 'member' && !message.failed),
    [messages],
  );
  const adminHasJoined = useMemo(
    () => messages.some((message) => message.sender_kind === 'admin'),
    [messages],
  );
  const waitingForAdmin = isRealtimeEnabled && memberHasSentMessage && !adminHasJoined;
  const shouldShowResetNotice = isRealtimeEnabled && Boolean(thread?.member_reset_at) && messages.length === 0;

  const positionClassName = useMemo(
    () => (liftForBottomNav ? 'bottom-[6.6rem] md:bottom-8' : 'bottom-5 md:bottom-8'),
    [liftForBottomNav],
  );

  const ensureThread = useCallback(async () => {
    if (thread) return thread;

    const next = await supportChatService.getOrCreateMyThread({
      hospitalId: user.hospitalId,
    });

    startTransition(() => {
      setThread(next);
    });

    return next;
  }, [thread, user.hospitalId]);

  useEffect(() => {
    if (openRequestToken <= 0) return;

    startTransition(() => {
      setIsOpen(true);
    });
  }, [openRequestToken]);

  useEffect(() => {
    if (!isRealtimeEnabled) {
      startTransition(() => {
        setThread(null);
        setMessages([]);
      });
      lastResetAtRef.current = null;
      setErrorMessage(null);
      setThreadBooting(false);
      setMessagesLoading(false);
      return;
    }

    let cancelled = false;
    setThreadBooting(true);

    void supportChatService.getMyThread(user.hospitalId)
      .then((nextThread) => {
        if (cancelled) return;
        startTransition(() => {
          setThread(nextThread);
        });
      })
      .catch((error) => {
        console.error('[SupportChatWidget] getMyThread failed:', error);
        if (!cancelled) setErrorMessage('상담 연결 상태를 확인하지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setThreadBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isRealtimeEnabled, user.hospitalId]);

  useEffect(() => {
    if (!isRealtimeEnabled || !thread?.id) return;

    const nextResetAt = thread.member_reset_at ?? null;
    if (!nextResetAt) {
      lastResetAtRef.current = null;
      return;
    }

    if (lastResetAtRef.current === nextResetAt) {
      return;
    }

    lastResetAtRef.current = nextResetAt;
    startTransition(() => {
      setMessages([]);
    });
    setErrorMessage(null);
  }, [isRealtimeEnabled, thread?.id, thread?.member_reset_at]);

  useEffect(() => {
    if (!isRealtimeEnabled || !thread?.id) return;

    const channel = supportChatService.subscribeToThread(thread.id, (payload) => {
      if (payload.eventType === 'DELETE') {
        startTransition(() => {
          setThread(null);
          setMessages([]);
        });
        return;
      }

      startTransition(() => {
        setThread(payload.new as SupportThread);
      });
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isRealtimeEnabled, thread?.id]);

  useEffect(() => {
    if (!isRealtimeEnabled) {
      setMessagesLoading(false);
      return;
    }
    if (!isOpen) return;
    if (!thread?.id) {
      startTransition(() => {
        setMessages([]);
      });
      setMessagesLoading(false);
      return;
    }

    let cancelled = false;
    let messageChannelId: ReturnType<typeof supportChatService.subscribeToMessages> | null = null;
    setMessagesLoading(true);
    setErrorMessage(null);

    const loadConversation = async () => {
      try {
        const [rows] = await Promise.all([
          supportChatService.getMessages(thread.id),
          supportChatService.markThreadRead(thread.id),
        ]);

        if (cancelled) return;

        startTransition(() => {
          setMessages(rows);
          setThread((prev) => (prev ? {
            ...prev,
            member_unread_count: 0,
            member_last_read_at: new Date().toISOString(),
          } : prev));
        });

        const nextChannel = supportChatService.subscribeToMessages(thread.id, (payload) => {
          if (payload.eventType !== 'INSERT') return;
          const next = payload.new as SupportMessage;
          startTransition(() => {
            setMessages((prev) => upsertSupportMessage(prev, next));
          });
        });

        if (cancelled) {
          void supabase.removeChannel(nextChannel);
          return;
        }

        messageChannelId = nextChannel;
      } catch (error) {
        console.error('[SupportChatWidget] loadConversation failed:', error);
        if (!cancelled) setErrorMessage('실시간 상담을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    void loadConversation();

    return () => {
      cancelled = true;
      if (messageChannelId) {
        void supabase.removeChannel(messageChannelId);
      }
    };
  }, [isOpen, isRealtimeEnabled, thread?.id]);

  useEffect(() => {
    if (!isRealtimeEnabled) return;
    if (!isOpen || !thread?.id || thread.member_unread_count === 0) return;

    void supportChatService.markThreadRead(thread.id)
      .then(() => {
        startTransition(() => {
          setThread((prev) => (prev ? {
            ...prev,
            member_unread_count: 0,
            member_last_read_at: new Date().toISOString(),
          } : prev));
        });
      })
      .catch((error) => {
        console.error('[SupportChatWidget] markThreadRead failed:', error);
      });
  }, [isOpen, isRealtimeEnabled, thread?.id, thread?.member_unread_count]);

  useEffect(() => {
    if (!isOpen) return;
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages.length, waitingForAdmin]);

  const handleSendRealtimeMessage = async () => {
    const nextBody = draft.trim();
    if (!nextBody || sending || isComposingRef.current) return;

    setSending(true);
    setErrorMessage(null);

    let optimisticId: string | null = null;

    try {
      const activeThread = await ensureThread();
      const optimisticMessage = createOptimisticMessage(user, activeThread.id, nextBody);
      optimisticId = optimisticMessage.id;

      startTransition(() => {
        setDraft('');
        setMessages((prev) => upsertSupportMessage(prev, optimisticMessage));
      });

      const message = await supportChatService.sendMessage({
        threadId: activeThread.id,
        body: nextBody,
      });

      startTransition(() => {
        setMessages((prev) => replaceSupportMessage(prev, optimisticMessage.id, message));
        setThread((prev) => ({
          ...(prev ?? activeThread),
          status: 'open',
          member_unread_count: 0,
          member_last_read_at: message.created_at,
          last_message_at: message.created_at,
          last_message_preview: message.body.slice(0, 120),
          last_message_sender_kind: 'member',
          updated_at: message.created_at,
        }));
      });
    } catch (error) {
      console.error('[SupportChatWidget] handleSendRealtimeMessage failed:', error);
      const failedMessageId = optimisticId;
      startTransition(() => {
        setDraft(nextBody);
        if (failedMessageId) {
          setMessages((prev) => patchSupportMessage(prev, failedMessageId, {
            failed: true,
            pending: false,
          }));
        }
      });
      setErrorMessage('메시지를 보내지 못했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (isRealtimeEnabled) {
      await handleSendRealtimeMessage();
    }
  };

  return (
    <div className={`pointer-events-none fixed right-4 z-[210] md:right-8 ${positionClassName}`}>
      {isOpen && (
        <div className="pointer-events-auto mb-3 w-[min(92vw,22rem)] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,17,31,0.98)_0%,rgba(8,18,30,0.94)_100%)] p-3 shadow-[0_28px_90px_rgba(2,8,23,0.42)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400/16 text-teal-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isRealtimeEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.5 3v-3A2.5 2.5 0 013 14.5v-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A2.5 2.5 0 016.5 6h11A2.5 2.5 0 0120 8.5v7A2.5 2.5 0 0117.5 18h-11A2.5 2.5 0 014 15.5v-7zm1.5.5L12 13l6.5-4" />
                  )}
                </svg>
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${
                !isRealtimeEnabled
                  ? 'bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.75)]'
                  : thread?.status === 'closed'
                    ? 'bg-slate-500'
                    : 'bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.9)]'
              }`}
              />
              {errorMessage && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/14 text-rose-200" title={errorMessage}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-7.4 12.8A1 1 0 003.75 18h16.5a1 1 0 00.86-1.34l-7.4-12.8a1 1 0 00-1.72 0z" />
                  </svg>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isRealtimeEnabled && threadBooting && (
                <span className="flex h-8 w-8 animate-spin items-center justify-center rounded-full border border-white/10 text-slate-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path d="M12 4V1m0 22v-3m8-8h3M1 12h3m13.657 5.657l2.121 2.121M4.222 4.222l2.121 2.121m11.314-2.121l-2.121 2.121M6.343 17.657l-2.121 2.121" stroke="currentColor" strokeLinecap="round" strokeWidth={2} />
                  </svg>
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="상담창 닫기"
                title="닫기"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div
            ref={messageViewportRef}
            className="max-h-[50vh] min-h-[18rem] space-y-3 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3"
          >
            <SupportNoticeCard
              tone="teal"
              title={`${user.name}님 안녕하세요! 디앤조이입니다.`}
              icon={(
                <svg className="h-4 w-4 text-teal-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              )}
              body={(
                <div className="space-y-1">
                  <p>운영팀이 빠르게 확인할 수 있도록 문의 내용을 남겨 주세요.</p>
                  {operatorLabel && (
                    <p className="text-[11px] text-teal-100/80">{hospitalName || '워크스페이스'} · {operatorLabel}</p>
                  )}
                </div>
              )}
            />

            <SupportNoticeCard
              title="상담 운영 시간 안내"
              tone="slate"
              icon={(
                <svg className="h-4 w-4 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-11 8h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              body={(
                <div className="space-y-1.5">
                  {SUPPORT_OPERATING_HOURS.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 text-[12px]">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-semibold text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />

            {isRealtimeEnabled ? (
              <>
                <SupportNoticeCard
                  title="메시지를 남겨 주시면 운영팀이 대화에 합류합니다"
                  tone="slate"
                  icon={(
                    <svg className="h-4 w-4 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.134 7-7 7a6.96 6.96 0 01-4.392-1.554L3 16l.554-3.608A6.96 6.96 0 013 10c0-3.866 3.134-7 7-7s7 3.134 7 7z" />
                    </svg>
                  )}
                  body="상담 종료 후 회원 화면에서는 대화가 초기화되고, 새 문의는 이 창에서 다시 이어집니다."
                />

                {shouldShowResetNotice && (
                  <SupportNoticeCard
                    title="이전 상담이 종료되었습니다"
                    tone="slate"
                    icon={(
                      <svg className="h-4 w-4 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    body="기존 대화는 회원 화면에서 정리되었고, 새 문의만 다시 이어집니다."
                  />
                )}

                {waitingForAdmin && (
                  <SupportNoticeCard
                    title="운영팀 확인 중"
                    tone="amber"
                    icon={(
                      <svg className="h-4 w-4 text-amber-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    body="문의 내용을 확인한 뒤 운영팀이 채팅에 합류합니다. 잠시만 기다려 주세요."
                  />
                )}
              </>
            ) : (
              <>
                <SupportNoticeCard
                  title={`${planLabel} 계정은 챗봇 상담을 준비 중입니다`}
                  tone="amber"
                  icon={(
                    <svg className="h-4 w-4 text-amber-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                  )}
                  body="현재는 실시간 운영자 연결 대신 문의하기를 통해 접수할 수 있습니다. 챗봇 상담은 준비되는 대로 이 창에서 이어집니다."
                />

                <SupportNoticeCard
                  title="문의 응답 안내"
                  tone="slate"
                  icon={(
                    <svg className="h-4 w-4 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  body="문의하기에서 접수해 주시면 영업일 기준 1일 이내에 운영팀이 이메일로 답변드립니다."
                />

                <div className="rounded-[1.35rem] border border-teal-400/20 bg-teal-400/8 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenContactForm?.();
                    }}
                    className="flex w-full items-center justify-between rounded-[1rem] bg-teal-400 px-4 py-3 text-left text-sm font-black text-slate-950 shadow-[0_18px_32px_rgba(45,212,191,0.24)] transition-transform hover:-translate-y-0.5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/10">
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A2.5 2.5 0 016.5 6h11A2.5 2.5 0 0120 8.5v7A2.5 2.5 0 0117.5 18h-11A2.5 2.5 0 014 15.5v-7zm1.5.5L12 13l6.5-4" />
                        </svg>
                      </span>
                      <span>
                        문의하기 작성
                        <span className="mt-0.5 block text-[11px] font-semibold text-slate-800/75">
                          접수 페이지로 이동합니다
                        </span>
                      </span>
                    </span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </>
            )}

            {messagesLoading ? (
              <div className="flex min-h-[8rem] items-center justify-center text-slate-400">
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <path d="M12 4V1m0 22v-3m8-8h3M1 12h3m13.657 5.657l2.121 2.121M4.222 4.222l2.121 2.121m11.314-2.121l-2.121 2.121M6.343 17.657l-2.121 2.121" stroke="currentColor" strokeLinecap="round" strokeWidth={2} />
                </svg>
                <span className="sr-only">상담창 준비 중</span>
              </div>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_kind === 'member';
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[84%] rounded-[1.35rem] px-4 py-3 shadow-sm ${
                      isMine
                        ? 'bg-teal-400 text-slate-950 shadow-[0_18px_36px_rgba(45,212,191,0.18)]'
                        : 'bg-white/96 text-slate-900 ring-1 ring-slate-200/70'
                    }`}>
                      <div className={`flex items-center gap-2 text-[11px] font-black ${
                        isMine ? 'text-slate-700/80' : 'text-slate-400'
                      }`}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                          {isMine ? (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.134 7-7 7a6.96 6.96 0 01-4.392-1.554L3 16l.554-3.608A6.96 6.96 0 013 10c0-3.866 3.134-7 7-7s7 3.134 7 7z" />
                            </svg>
                          )}
                        </span>
                        <span>{formatTimestamp(message.created_at)}</span>
                        {message.pending && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth={2} />
                            </svg>
                          </span>
                        )}
                        {message.failed && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/18 text-rose-600">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-7.4 12.8A1 1 0 003.75 18h16.5a1 1 0 00.86-1.34l-7.4-12.8a1 1 0 00-1.72 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {isRealtimeEnabled ? (
            <div className="mt-3 flex items-end gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2">
              <textarea
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                }}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                onKeyDown={(event) => {
                  const nativeEvent = event.nativeEvent as KeyboardEvent;
                  if (isComposingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229) {
                    return;
                  }
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                aria-label={`${hospitalName || '워크스페이스'} 상담 메시지 입력`}
                className="min-h-[4.8rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500"
                placeholder="운영팀에 바로 전달할 내용을 남겨 주세요. Enter 전송, Shift+Enter 줄바꿈"
                maxLength={2000}
              />
              <div className="flex flex-col items-center gap-2">
                {thread?.status === 'closed' && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300" title="해결됨">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-400 text-slate-950 shadow-[0_16px_30px_rgba(45,212,191,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
                  aria-label="메시지 전송"
                  title="전송"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-[12px] leading-5 text-slate-400">
              챗봇 상담 기능은 준비 중입니다. 아래 문의하기 버튼으로 내용을 남겨 주세요.
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-auto hidden md:flex justify-end">
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
          }}
          className="group relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.45rem] border border-white/12 bg-[#06111f] text-white shadow-[0_20px_44px_rgba(6,17,31,0.38)] transition-all hover:-translate-y-0.5 hover:bg-[#091727]"
          aria-label={isRealtimeEnabled
            ? `${hospitalName || '워크스페이스'} 실시간 상담 열기`
            : `${hospitalName || '워크스페이스'} 챗봇 상담 열기`}
          title={hospitalName || (isRealtimeEnabled ? '실시간 상담' : '챗봇 상담')}
        >
          {!isRealtimeEnabled && (
            <span className="pointer-events-none absolute bottom-full right-0 mb-3 w-max max-w-[calc(100vw-1.5rem)] rounded-[1.35rem] border border-white/10 bg-[#071526] px-4 py-3 text-left opacity-0 shadow-[0_18px_40px_rgba(2,8,23,0.34)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:min-w-[22rem]">
              <span className="block text-[12px] font-black leading-5 text-white sm:whitespace-nowrap">
                실시간 문의는
                <span className="text-teal-300"> Business </span>
                계정부터 사용 가능합니다.
              </span>
              <span className="mt-1.5 block text-[11px] font-semibold leading-[1.15rem] text-slate-300">
                클릭하면 챗봇 상담창이 열리고, 문의하기 버튼으로 접수할 수 있습니다.
              </span>
            </span>
          )}
          <span className="absolute inset-0 rounded-[1.45rem] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.22),transparent_54%)] opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-teal-400 text-slate-950 shadow-[0_0_0_10px_rgba(45,212,191,0.1)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isRealtimeEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A2.5 2.5 0 016.5 6h11A2.5 2.5 0 0120 8.5v7A2.5 2.5 0 0117.5 18h-11A2.5 2.5 0 014 15.5v-7zm1.5.5L12 13l6.5-4" />
              )}
            </svg>
          </span>

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default SupportChatWidget;
