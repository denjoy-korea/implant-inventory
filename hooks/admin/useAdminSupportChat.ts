import { startTransition, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  patchSupportMessage,
  replaceSupportMessage,
  sortSupportThreads,
  supportChatService,
  SupportDisplayMessage,
  SupportMessage,
  SupportThread,
  SupportThreadStatus,
  upsertSupportMessage,
  upsertSupportThread,
} from '../../services/supportChatService';
import type { ShowToast } from './adminTypes';

export function useAdminSupportChat(showToast: ShowToast) {
  const [supportInitialized, setSupportInitialized] = useState(false);
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [supportThreadsLoading, setSupportThreadsLoading] = useState(false);
  const [selectedSupportThreadId, setSelectedSupportThreadId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportDisplayMessage[]>([]);
  const [supportMessagesLoading, setSupportMessagesLoading] = useState(false);
  const [supportDraft, setSupportDraft] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportStatusUpdating, setSupportStatusUpdating] = useState<string | null>(null);

  const selectedSupportThread = useMemo(
    () => supportThreads.find((thread) => thread.id === selectedSupportThreadId) ?? null,
    [supportThreads, selectedSupportThreadId],
  );

  const supportUnreadThreadCount = useMemo(
    () => supportThreads.filter((thread) => thread.admin_unread_count > 0).length,
    [supportThreads],
  );

  const loadSupportThreads = async () => {
    setSupportInitialized(true);
    setSupportThreadsLoading(true);
    try {
      const threads = sortSupportThreads(await supportChatService.getAdminThreads());
      setSupportThreads(threads);
      setSelectedSupportThreadId((prev) => {
        if (prev && threads.some((thread) => thread.id === prev)) return prev;
        return threads[0]?.id ?? null;
      });
    } catch (error) {
      console.error('[useAdminSupportChat] loadSupportThreads failed:', error);
      showToast('실시간 상담 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setSupportThreadsLoading(false);
    }
  };

  const handleSelectSupportThread = (thread: SupportThread) => {
    setSelectedSupportThreadId(thread.id);
  };

  const handleSendSupportMessage = async () => {
    if (!selectedSupportThreadId || !supportDraft.trim()) return;

    const nextBody = supportDraft.trim();
    setSupportSending(true);
    setSupportDraft('');

    const optimisticMessage: SupportDisplayMessage = {
      id: `admin-local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      thread_id: selectedSupportThreadId,
      sender_id: null,
      sender_kind: 'admin',
      sender_name: '운영팀',
      body: nextBody,
      created_at: new Date().toISOString(),
      pending: true,
    };

    try {
      startTransition(() => {
        setSupportMessages((prev) => upsertSupportMessage(prev, optimisticMessage));
      });

      const message = await supportChatService.sendMessage({
        threadId: selectedSupportThreadId,
        body: nextBody,
      });

      startTransition(() => {
        setSupportMessages((prev) => replaceSupportMessage(prev, optimisticMessage.id, message));
        setSupportThreads((prev) => upsertSupportThread(prev, {
          ...(selectedSupportThread ?? {
            id: selectedSupportThreadId,
            hospital_id: '',
            created_by_user_id: null,
            created_by_name: null,
            status: 'open',
            admin_last_read_at: null,
            member_last_read_at: null,
            admin_unread_count: 0,
            member_unread_count: 0,
            last_message_at: null,
            last_message_preview: null,
            last_message_sender_kind: null,
            created_at: message.created_at,
            updated_at: message.created_at,
          }),
          status: 'open',
          admin_unread_count: 0,
          admin_last_read_at: message.created_at,
          last_message_at: message.created_at,
          last_message_preview: message.body.slice(0, 120),
          last_message_sender_kind: 'admin',
          updated_at: message.created_at,
        }));
      });
    } catch (error) {
      console.error('[useAdminSupportChat] handleSendSupportMessage failed:', error);
      showToast('메시지 전송에 실패했습니다.', 'error');
      startTransition(() => {
        setSupportDraft(nextBody);
        setSupportMessages((prev) => patchSupportMessage(prev, optimisticMessage.id, {
          failed: true,
          pending: false,
        }));
      });
    } finally {
      setSupportSending(false);
    }
  };

  const handleUpdateSupportThreadStatus = async (
    thread: SupportThread,
    status: SupportThreadStatus,
  ) => {
    if (thread.status === status) return;

    setSupportStatusUpdating(thread.id);
    try {
      await supportChatService.updateThreadStatus(thread.id, status);
      startTransition(() => {
        setSupportThreads((prev) => upsertSupportThread(prev, {
          ...thread,
          status,
          updated_at: new Date().toISOString(),
        }));
      });
    } catch (error) {
      console.error('[useAdminSupportChat] handleUpdateSupportThreadStatus failed:', error);
      showToast('상담 상태 변경에 실패했습니다.', 'error');
    } finally {
      setSupportStatusUpdating(null);
    }
  };

  useEffect(() => {
    if (!supportInitialized) return;

    const channel = supportChatService.subscribeToThreadList((payload) => {
      if (payload.eventType === 'DELETE') {
        const previous = payload.old as Partial<SupportThread>;
        startTransition(() => {
          setSupportThreads((prev) => prev.filter((thread) => thread.id !== previous.id));
          setSelectedSupportThreadId((prev) => (prev === previous.id ? null : prev));
        });
        return;
      }

      const next = payload.new as SupportThread;
      startTransition(() => {
        setSupportThreads((prev) => upsertSupportThread(prev, next));
        setSelectedSupportThreadId((prev) => prev ?? next.id);
      });
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supportInitialized]);

  useEffect(() => {
    if (!supportInitialized || !selectedSupportThreadId) {
      startTransition(() => setSupportMessages([]));
      return;
    }

    let cancelled = false;
    setSupportMessagesLoading(true);

    const loadSelectedThread = async () => {
      try {
        const [messages] = await Promise.all([
          supportChatService.getMessages(selectedSupportThreadId),
          supportChatService.markThreadRead(selectedSupportThreadId),
        ]);

        if (cancelled) return;

        startTransition(() => {
          setSupportMessages(messages);
          setSupportThreads((prev) => prev.map((thread) => (
            thread.id === selectedSupportThreadId
              ? {
                ...thread,
                admin_unread_count: 0,
                admin_last_read_at: new Date().toISOString(),
              }
              : thread
          )));
        });
      } catch (error) {
        console.error('[useAdminSupportChat] loadSelectedThread failed:', error);
        if (!cancelled) {
          showToast('상담 대화를 불러오지 못했습니다.', 'error');
        }
      } finally {
        if (!cancelled) {
          setSupportMessagesLoading(false);
        }
      }
    };

    void loadSelectedThread();

    const channel = supportChatService.subscribeToMessages(selectedSupportThreadId, (payload) => {
      if (payload.eventType !== 'INSERT') return;
      const next = payload.new as SupportMessage;
      startTransition(() => {
        setSupportMessages((prev) => upsertSupportMessage(prev, next));
      });
    });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [selectedSupportThreadId, showToast, supportInitialized]);

  useEffect(() => {
    if (
      !supportInitialized
      || !selectedSupportThreadId
      || !selectedSupportThread
      || selectedSupportThread.admin_unread_count === 0
    ) {
      return;
    }

    void supportChatService.markThreadRead(selectedSupportThreadId)
      .then(() => {
        startTransition(() => {
          setSupportThreads((prev) => prev.map((thread) => (
            thread.id === selectedSupportThreadId
              ? {
                ...thread,
                admin_unread_count: 0,
                admin_last_read_at: new Date().toISOString(),
              }
              : thread
          )));
        });
      })
      .catch((error) => {
        console.error('[useAdminSupportChat] auto mark read failed:', error);
      });
  }, [selectedSupportThread, selectedSupportThreadId, supportInitialized]);

  return {
    supportInitialized,
    supportThreads,
    supportThreadsLoading,
    selectedSupportThread,
    supportMessages,
    supportMessagesLoading,
    supportDraft,
    setSupportDraft,
    supportSending,
    supportStatusUpdating,
    supportUnreadThreadCount,
    loadSupportThreads,
    handleSelectSupportThread,
    handleSendSupportMessage,
    handleUpdateSupportThreadStatus,
  };
}
