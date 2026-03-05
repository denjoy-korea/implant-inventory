import { supabase } from './supabaseClient';

export type DentwebRunStatus = 'idle' | 'running' | 'success' | 'no_data' | 'failed';

export interface DentwebAutomationState {
  hospitalId: string;
  enabled: boolean;
  intervalMinutes: number;
  manualRunRequested: boolean;
  manualRunRequestedAt: string | null;
  lastRunAt: string | null;
  lastStatus: DentwebRunStatus;
  lastMessage: string | null;
  claimedAt: string | null;
  hasAgentToken: boolean;
  agentTokenMasked: string | null;
  staleTimeoutMinutes: number;
  updatedAt: string;
}

type Action =
  | 'get_state'
  | 'save_settings'
  | 'request_run'
  | 'generate_token';

interface InvokeResponse {
  ok: boolean;
  error?: string;
  message?: string;
  state?: {
    hospital_id: string;
    enabled: boolean;
    interval_minutes: number;
    manual_run_requested: boolean;
    manual_run_requested_at: string | null;
    last_run_at: string | null;
    last_status: DentwebRunStatus;
    last_message: string | null;
    claimed_at: string | null;
    has_agent_token: boolean;
    agent_token_masked: string | null;
    stale_timeout_minutes: number;
    updated_at: string;
  };
  agent_token?: string;
}

function toState(raw: NonNullable<InvokeResponse['state']>): DentwebAutomationState {
  return {
    hospitalId: raw.hospital_id,
    enabled: raw.enabled,
    intervalMinutes: raw.interval_minutes,
    manualRunRequested: raw.manual_run_requested,
    manualRunRequestedAt: raw.manual_run_requested_at,
    lastRunAt: raw.last_run_at,
    lastStatus: raw.last_status,
    lastMessage: raw.last_message,
    claimedAt: raw.claimed_at,
    hasAgentToken: raw.has_agent_token,
    agentTokenMasked: raw.agent_token_masked,
    staleTimeoutMinutes: raw.stale_timeout_minutes,
    updatedAt: raw.updated_at,
  };
}

async function invoke(action: Action, payload?: Record<string, unknown>): Promise<InvokeResponse> {
  const { data, error } = await supabase.functions.invoke('dentweb-automation', {
    body: {
      action,
      ...(payload ?? {}),
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return (data ?? { ok: false, error: 'empty_response' }) as InvokeResponse;
}

export const dentwebAutomationService = {
  async getState(): Promise<DentwebAutomationState | null> {
    const res = await invoke('get_state');
    if (!res.ok || !res.state) return null;
    return toState(res.state);
  },

  async saveSettings(enabled: boolean, intervalMinutes: number): Promise<{ ok: boolean; state?: DentwebAutomationState; error?: string; message?: string }> {
    const res = await invoke('save_settings', {
      enabled,
      interval_minutes: intervalMinutes,
    });
    if (!res.ok || !res.state) return { ok: false, error: res.error, message: res.message };
    return { ok: true, state: toState(res.state) };
  },

  async requestRun(): Promise<{ ok: boolean; state?: DentwebAutomationState; error?: string; message?: string }> {
    const res = await invoke('request_run');
    if (!res.ok || !res.state) return { ok: false, error: res.error, message: res.message };
    return { ok: true, state: toState(res.state) };
  },

  async generateToken(): Promise<{ ok: boolean; agentToken?: string; state?: DentwebAutomationState; error?: string; message?: string }> {
    const res = await invoke('generate_token');
    if (!res.ok || !res.state) return { ok: false, error: res.error, message: res.message };
    return { ok: true, agentToken: res.agent_token, state: toState(res.state) };
  },
};
