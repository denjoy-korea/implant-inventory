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
  member_reset_at: string | null;
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

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

const THREAD_SELECT = `
  id,
  hospital_id,
  created_by_user_id,
  created_by_name,
  status,
  admin_last_read_at,
  member_last_read_at,
  member_reset_at,
  admin_unread_count,
  member_unread_count,
  last_message_at,
  last_message_preview,
  last_message_sender_kind,
  created_at,
  updated_at
`;

const THREAD_SELECT_LEGACY = `
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

async function notifySupportSlackMessage(params: {
  threadId: string;
  messageId: string;
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-support-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        thread_id: params.threadId,
        message_id: params.messageId,
      }),
    });

    if (!response.ok) {
      console.warn('[supportChatService] notify-support-message failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('[supportChatService] notify-support-message request failed:', error);
  }
}

function isMissingMemberResetColumn(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  const message = (error?.message ?? '').toLowerCase();
  return error?.code === '42703' && message.includes('member_reset_at');
}

function normalizeThreadRow(row: Record<string, unknown>): SupportThread {
  return {
    id: String(row.id),
    hospital_id: String(row.hospital_id),
    created_by_user_id: (row.created_by_user_id as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
    status: (row.status as SupportThreadStatus) ?? 'open',
    admin_last_read_at: (row.admin_last_read_at as string | null) ?? null,
    member_last_read_at: (row.member_last_read_at as string | null) ?? null,
    member_reset_at: (row.member_reset_at as string | null) ?? null,
    admin_unread_count: Number(row.admin_unread_count ?? 0),
    member_unread_count: Number(row.member_unread_count ?? 0),
    last_message_at: (row.last_message_at as string | null) ?? null,
    last_message_preview: (row.last_message_preview as string | null) ?? null,
    last_message_sender_kind: (row.last_message_sender_kind as SupportSenderKind | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function fetchThreads(params: {
  hospitalId?: string;
  single?: boolean;
} = {}): Promise<SupportThread[] | SupportThread | null> {
  const buildQuery = (selectClause: string) => {
    let query = supabase
      .from('support_threads')
      .select(selectClause);

    if (params.hospitalId) {
      query = query.eq('hospital_id', params.hospitalId);
    }

    if (!params.single) {
      query = query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });
    }

    return query;
  };

  const primary = params.single
    ? await buildQuery(THREAD_SELECT).maybeSingle()
    : await buildQuery(THREAD_SELECT);

  if (!primary.error) {
    if (params.single) {
      return primary.data ? normalizeThreadRow(primary.data as unknown as Record<string, unknown>) : null;
    }
    return ((primary.data ?? []) as unknown as Record<string, unknown>[]).map(normalizeThreadRow);
  }

  if (!isMissingMemberResetColumn(primary.error)) {
    throw primary.error;
  }

  const fallback = params.single
    ? await buildQuery(THREAD_SELECT_LEGACY).maybeSingle()
    : await buildQuery(THREAD_SELECT_LEGACY);

  if (fallback.error) throw fallback.error;

  if (params.single) {
    return fallback.data ? normalizeThreadRow(fallback.data as unknown as Record<string, unknown>) : null;
  }
  return ((fallback.data ?? []) as unknown as Record<string, unknown>[]).map(normalizeThreadRow);
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
    return await fetchThreads({
      hospitalId,
      single: true,
    }) as SupportThread | null;
  },

  async getOrCreateMyThread(params: {
    hospitalId: string;
  }): Promise<SupportThread> {
    const existing = await this.getMyThread(params.hospitalId);
    if (existing) return existing;

    const { error } = await supabase
      .from('support_threads')
      .insert({
        hospital_id: params.hospitalId,
      });

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
    return await fetchThreads() as SupportThread[];
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

    if (data.sender_kind === 'member') {
      void notifySupportSlackMessage({
        threadId: data.thread_id,
        messageId: data.id,
      });
    }

    return data as SupportMessage;
  },

  async markThreadRead(threadId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_support_thread_read', {
      p_thread_id: threadId,
    });
    if (error) throw error;
  },

  async updateThreadStatus(threadId: string, status: SupportThreadStatus): Promise<void> {
    const now = new Date().toISOString();
    const nextValues = status === 'closed'
      ? {
        status,
        member_reset_at: now,
        member_unread_count: 0,
        member_last_read_at: now,
      }
      : { status };

    const { error } = await supabase
      .from('support_threads')
      .update(nextValues)
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
