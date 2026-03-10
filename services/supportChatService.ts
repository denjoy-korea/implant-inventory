import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type SupportThreadStatus = 'open' | 'closed';
export type SupportSenderKind = 'member' | 'admin';

export interface SupportThread {
  id: string;
  hospital_id: string;
  created_by_user_id: string | null;
  created_by_name: string | null;
  status: SupportThreadStatus;
  admin_last_read_at: string | null;
  member_last_read_at: string | null;
  admin_unread_count: number;
  member_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_kind: SupportSenderKind | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_kind: SupportSenderKind;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface SupportDisplayMessage extends SupportMessage {
  failed?: boolean;
  pending?: boolean;
}

const THREAD_SELECT = `
  id,
  hospital_id,
  created_by_user_id,
  created_by_name,
  status,
  admin_last_read_at,
  member_last_read_at,
  admin_unread_count,
  member_unread_count,
  last_message_at,
  last_message_preview,
  last_message_sender_kind,
  created_at,
  updated_at
`;

function buildChannel(name: string): RealtimeChannel {
  return supabase.channel(`${name}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
}

function normalizeBody(body: string): string {
  return body.trim();
}

export function sortSupportThreads(threads: SupportThread[]): SupportThread[] {
  return [...threads].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function upsertSupportThread(threads: SupportThread[], next: SupportThread): SupportThread[] {
  const index = threads.findIndex((thread) => thread.id === next.id);
  if (index === -1) {
    return sortSupportThreads([next, ...threads]);
  }

  const updated = [...threads];
  updated[index] = next;
  return sortSupportThreads(updated);
}

export function upsertSupportMessage<T extends SupportMessage>(messages: T[], next: T): T[] {
  const index = messages.findIndex((message) => message.id === next.id);
  if (index === -1) {
    return [...messages, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const updated = [...messages];
  updated[index] = next;
  return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function replaceSupportMessage<T extends SupportMessage>(
  messages: T[],
  previousId: string,
  next: T,
): T[] {
  const filtered = messages.filter((message) => message.id !== previousId);
  return upsertSupportMessage(filtered, next);
}

export function patchSupportMessage<T extends SupportDisplayMessage>(
  messages: T[],
  messageId: string,
  patch: Partial<T>,
): T[] {
  return messages.map((message) => (
    message.id === messageId
      ? { ...message, ...patch }
      : message
  ));
}

export const supportChatService = {
  async getMyThread(hospitalId: string): Promise<SupportThread | null> {
    const { data, error } = await supabase
      .from('support_threads')
      .select(THREAD_SELECT)
      .eq('hospital_id', hospitalId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as SupportThread | null;
  },

  async getOrCreateMyThread(params: {
    hospitalId: string;
  }): Promise<SupportThread> {
    const existing = await this.getMyThread(params.hospitalId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('support_threads')
      .insert({
        hospital_id: params.hospitalId,
      })
      .select(THREAD_SELECT)
      .single();

    if (!error && data) {
      return data as SupportThread;
    }

    if (error && error.code !== '23505') {
      throw error;
    }

    const retried = await this.getMyThread(params.hospitalId);
    if (!retried) {
      throw error ?? new Error('support_thread_create_failed');
    }
    return retried;
  },

  async getAdminThreads(): Promise<SupportThread[]> {
    const { data, error } = await supabase
      .from('support_threads')
      .select(THREAD_SELECT)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as SupportThread[];
  },

  async getMessages(threadId: string, limit = 200): Promise<SupportMessage[]> {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, thread_id, sender_id, sender_kind, sender_name, body, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as SupportMessage[];
  },

  async sendMessage(params: {
    threadId: string;
    body: string;
  }): Promise<SupportMessage> {
    const body = normalizeBody(params.body);
    if (!body) {
      throw new Error('메시지를 입력해 주세요.');
    }

    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        thread_id: params.threadId,
        body,
      })
      .select('id, thread_id, sender_id, sender_kind, sender_name, body, created_at')
      .single();

    if (error) throw error;
    return data as SupportMessage;
  },

  async markThreadRead(threadId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_support_thread_read', {
      p_thread_id: threadId,
    });
    if (error) throw error;
  },

  async updateThreadStatus(threadId: string, status: SupportThreadStatus): Promise<void> {
    const { error } = await supabase
      .from('support_threads')
      .update({ status })
      .eq('id', threadId);
    if (error) throw error;
  },

  subscribeToThread(threadId: string, callback: (payload: RealtimePostgresChangesPayload<SupportThread>) => void) {
    return buildChannel(`support-thread-${threadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_threads',
        filter: `id=eq.${threadId}`,
      }, callback)
      .subscribe();
  },

  subscribeToThreadList(callback: (payload: RealtimePostgresChangesPayload<SupportThread>) => void) {
    return buildChannel('support-thread-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_threads',
      }, callback)
      .subscribe();
  },

  subscribeToMessages(threadId: string, callback: (payload: RealtimePostgresChangesPayload<SupportMessage>) => void) {
    return buildChannel(`support-messages-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `thread_id=eq.${threadId}`,
      }, callback)
      .subscribe();
  },
};
