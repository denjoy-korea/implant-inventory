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
import type { User } from '../../types';

interface SupportChatWidgetProps {
  user: User;
  hospitalName: string;
  liftForBottomNav?: boolean;
}

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

const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({
  user,
  hospitalName,
  liftForBottomNav = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportDisplayMessage[]>([]);
  const [threadBooting, setThreadBooting] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = thread?.member_unread_count ?? 0;

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
  }, [user.hospitalId]);

  useEffect(() => {
    if (!thread?.id) return;

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
  }, [thread?.id]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let messageChannelId: ReturnType<typeof supportChatService.subscribeToMessages> | null = null;
    setMessagesLoading(true);
    setErrorMessage(null);

    const loadConversation = async () => {
      try {
        const activeThread = await ensureThread();
        const [rows] = await Promise.all([
          supportChatService.getMessages(activeThread.id),
          supportChatService.markThreadRead(activeThread.id),
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

        const nextChannel = supportChatService.subscribeToMessages(activeThread.id, (payload) => {
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
  }, [ensureThread, isOpen]);

  useEffect(() => {
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
  }, [isOpen, thread?.id, thread?.member_unread_count]);

  useEffect(() => {
    if (!isOpen) return;
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    const nextBody = draft.trim();
    if (!nextBody || sending) return;

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
        setThread((prev) => (prev ? {
          ...prev,
          status: 'open',
          member_unread_count: 0,
          member_last_read_at: message.created_at,
          last_message_at: message.created_at,
          last_message_preview: message.body.slice(0, 120),
          last_message_sender_kind: 'member',
          updated_at: message.created_at,
        } : prev));
      });
    } catch (error) {
      console.error('[SupportChatWidget] handleSend failed:', error);
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

  return (
    <div className={`pointer-events-none fixed right-4 z-[210] md:right-8 ${positionClassName}`}>
      {isOpen && (
        <div className="pointer-events-auto mb-3 w-[min(92vw,22rem)] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,17,31,0.98)_0%,rgba(8,18,30,0.94)_100%)] p-3 shadow-[0_28px_90px_rgba(2,8,23,0.42)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400/16 text-teal-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.5 3v-3A2.5 2.5 0 013 14.5v-7z" />
                </svg>
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${thread?.status === 'closed' ? 'bg-slate-500' : 'bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.9)]'}`} />
              {errorMessage && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/14 text-rose-200" title={errorMessage}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-7.4 12.8A1 1 0 003.75 18h16.5a1 1 0 00.86-1.34l-7.4-12.8a1 1 0 00-1.72 0z" />
                  </svg>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {threadBooting && (
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
            {threadBooting || messagesLoading ? (
              <div className="flex h-full min-h-[14rem] items-center justify-center text-slate-400">
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <path d="M12 4V1m0 22v-3m8-8h3M1 12h3m13.657 5.657l2.121 2.121M4.222 4.222l2.121 2.121m11.314-2.121l-2.121 2.121M6.343 17.657l-2.121 2.121" stroke="currentColor" strokeLinecap="round" strokeWidth={2} />
                </svg>
                <span className="sr-only">상담창 준비 중</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[14rem] items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/15 text-slate-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.5 3v-3A2.5 2.5 0 013 14.5v-7z" />
                  </svg>
                </div>
                <span className="sr-only">첫 메시지를 입력하면 상담이 시작됩니다.</span>
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

          <div className="mt-3 flex items-end gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              aria-label={`${hospitalName || '워크스페이스'} 상담 메시지 입력`}
              className="min-h-[4.8rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500"
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
        </div>
      )}

      <div className="pointer-events-auto flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.45rem] border border-white/12 bg-[#06111f] text-white shadow-[0_20px_44px_rgba(6,17,31,0.38)] transition-all hover:-translate-y-0.5 hover:bg-[#091727]"
          aria-label={`${hospitalName || '워크스페이스'} 실시간 상담 열기`}
          title={hospitalName || '실시간 상담'}
        >
          <span className="absolute inset-0 rounded-[1.45rem] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.22),transparent_54%)] opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-teal-400 text-slate-950 shadow-[0_0_0_10px_rgba(45,212,191,0.1)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
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
