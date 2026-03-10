import React from 'react';
import {
  SupportDisplayMessage,
  SupportThread,
  SupportThreadStatus,
} from '../../../services/supportChatService';

interface SystemAdminSupportChatTabProps {
  supportThreads: SupportThread[];
  supportThreadsLoading: boolean;
  selectedSupportThread: SupportThread | null;
  supportMessages: SupportDisplayMessage[];
  supportMessagesLoading: boolean;
  supportDraft: string;
  supportSending: boolean;
  supportStatusUpdating: string | null;
  getHospitalName: (hospitalId: string | null) => string;
  onSelectSupportThread: (thread: SupportThread) => void;
  onSupportDraftChange: (value: string) => void;
  onSendSupportMessage: () => void;
  onUpdateSupportThreadStatus: (thread: SupportThread, status: SupportThreadStatus) => void;
}

function formatThreadTime(value: string | null): string {
  if (!value) return '방금 전';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function formatMessageTime(value: string): string {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_ICON_STYLES: Record<SupportThreadStatus, string> = {
  open: 'bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]',
  closed: 'bg-slate-900 text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)]',
};

const STATUS_MUTED_STYLES: Record<SupportThreadStatus, string> = {
  open: 'bg-white text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-50',
  closed: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50',
};

const SystemAdminSupportChatTab: React.FC<SystemAdminSupportChatTabProps> = ({
  supportThreads,
  supportThreadsLoading,
  selectedSupportThread,
  supportMessages,
  supportMessagesLoading,
  supportDraft,
  supportSending,
  supportStatusUpdating,
  getHospitalName,
  onSelectSupportThread,
  onSupportDraftChange,
  onSendSupportMessage,
  onUpdateSupportThreadStatus,
}) => {
  const unreadThreadCount = supportThreads.filter((thread) => thread.admin_unread_count > 0).length;
  const closedCount = supportThreads.filter((thread) => thread.status === 'closed').length;

  return (
    <div className="space-y-4">
      {!supportThreadsLoading && (
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              count: supportThreads.length,
              title: '전체 상담방',
              tone: 'bg-white text-slate-700 ring-1 ring-slate-200',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              ),
            },
            {
              count: unreadThreadCount,
              title: '새 답변 대기',
              tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              ),
            },
            {
              count: closedCount,
              title: '해결됨',
              tone: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`flex items-center gap-2 rounded-full px-3 py-2 ${item.tone}`}
              title={item.title}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {item.icon}
                </svg>
              </span>
              <span className="text-sm font-black">{item.count}</span>
            </div>
          ))}
        </div>
      )}

      {supportThreadsLoading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white py-20 text-center text-sm text-slate-400">
          상담방을 불러오는 중...
        </div>
      ) : supportThreads.length === 0 ? (
        <div className="flex min-h-[22rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-300/40">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-3 shadow-sm">
            <div className="max-h-[calc(100vh-17rem)] space-y-2 overflow-y-auto pr-1 [content-visibility:auto]">
              {supportThreads.map((thread) => {
                const isSelected = selectedSupportThread?.id === thread.id;
                const lastSenderIsMember = thread.last_message_sender_kind === 'member';

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onSelectSupportThread(thread)}
                    className={`w-full rounded-[1.5rem] border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-[0_20px_50px_rgba(15,23,42,0.24)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {getHospitalName(thread.hospital_id)}
                        </p>
                        <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A3 3 0 016 17h12a3 3 0 01.879.132M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 8a6 6 0 10-12 0" />
                            </svg>
                          </span>
                          <span className="truncate">{thread.created_by_name || '이름 미상'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isSelected
                            ? 'bg-white/10 text-white'
                            : thread.status === 'open'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {thread.status === 'open' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            )}
                          </svg>
                        </span>
                        {thread.admin_unread_count > 0 && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            isSelected ? 'bg-amber-300 text-slate-950' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {thread.admin_unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {thread.last_message_preview && (
                      <p className={`mt-3 line-clamp-2 text-xs leading-relaxed ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                        {thread.last_message_preview}
                      </p>
                    )}

                    <div className={`mt-3 flex items-center justify-between text-[11px] font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {lastSenderIsMember ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A3 3 0 016 17h12a3 3 0 01.879.132M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 8a6 6 0 10-12 0" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.134 7-7 7a6.96 6.96 0 01-4.392-1.554L3 16l.554-3.608A6.96 6.96 0 013 10c0-3.866 3.134-7 7-7s7 3.134 7 7z" />
                          )}
                        </svg>
                        <span>{lastSenderIsMember ? 'Member' : 'Admin'}</span>
                      </span>
                      <span>{formatThreadTime(thread.last_message_at ?? thread.created_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {selectedSupportThread ? (
            <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_48%),linear-gradient(180deg,#fff,#f8fafc)] shadow-sm">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-slate-900">
                      {getHospitalName(selectedSupportThread.hospital_id)}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A3 3 0 016 17h12a3 3 0 01.879.132M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 8a6 6 0 10-12 0" />
                        </svg>
                      </span>
                      <span>{selectedSupportThread.created_by_name || '이름 미상'}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{formatThreadTime(selectedSupportThread.last_message_at ?? selectedSupportThread.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {([
                      {
                        status: 'open' as const,
                        title: '응대중',
                        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
                      },
                      {
                        status: 'closed' as const,
                        title: '해결됨',
                        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
                      },
                    ]).map((item) => {
                      const selected = selectedSupportThread.status === item.status;

                      return (
                        <button
                          key={item.status}
                          type="button"
                          disabled={supportStatusUpdating === selectedSupportThread.id}
                          onClick={() => onUpdateSupportThreadStatus(selectedSupportThread, item.status)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
                            selected ? STATUS_ICON_STYLES[item.status] : STATUS_MUTED_STYLES[item.status]
                          }`}
                          title={item.title}
                          aria-label={item.title}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {item.icon}
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex min-h-[560px] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5 [content-visibility:auto]">
                  {supportMessagesLoading ? (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <path d="M12 4V1m0 22v-3m8-8h3M1 12h3m13.657 5.657l2.121 2.121M4.222 4.222l2.121 2.121m11.314-2.121l-2.121 2.121M6.343 17.657l-2.121 2.121" stroke="currentColor" strokeLinecap="round" strokeWidth={2} />
                      </svg>
                    </div>
                  ) : supportMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    supportMessages.map((message) => {
                      const isAdmin = message.sender_kind === 'admin';

                      return (
                        <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[86%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                            isAdmin
                              ? 'bg-slate-900 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]'
                              : 'bg-white text-slate-800 ring-1 ring-slate-200'
                          }`}>
                            <div className={`flex items-center gap-2 text-[11px] font-bold ${
                              isAdmin ? 'text-slate-300' : 'text-slate-400'
                            }`}>
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                                {isAdmin ? (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                ) : (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A3 3 0 016 17h12a3 3 0 01.879.132M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 8a6 6 0 10-12 0" />
                                  </svg>
                                )}
                              </span>
                              <span>{formatMessageTime(message.created_at)}</span>
                              {message.pending && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth={2} />
                                  </svg>
                                </span>
                              )}
                              {message.failed && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/18 text-rose-500">
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

                <div className="border-t border-slate-200 bg-white/90 px-4 py-4 sm:px-5">
                  <div className="flex items-end gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2">
                    <textarea
                      value={supportDraft}
                      onChange={(event) => onSupportDraftChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void onSendSupportMessage();
                        }
                      }}
                      aria-label="운영자 답변 입력"
                      className="min-h-[4.8rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-400"
                      maxLength={2000}
                    />
                    <button
                      type="button"
                      disabled={supportSending || !supportDraft.trim()}
                      onClick={() => void onSendSupportMessage()}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                      aria-label="답변 전송"
                      title="전송"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="flex min-h-[560px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-slate-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemAdminSupportChatTab;
