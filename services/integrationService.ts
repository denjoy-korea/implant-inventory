import { supabase } from './supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from './cryptoUtils';
import { IntegrationProvider, HospitalIntegration, IntegrationConfig } from '../types';

export const integrationService = {
  /** 병원의 모든 인테그레이션 조회 (config는 암호화 상태) */
  async getIntegrations(hospitalId: string): Promise<HospitalIntegration[]> {
    const { data, error } = await supabase
      .from('hospital_integrations')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('provider');

    if (error) {
      console.error('[integrationService] getIntegrations failed:', error);
      return [];
    }
    return (data ?? []) as HospitalIntegration[];
  },

  /** 인테그레이션 설정 저장 (upsert) */
  async upsertIntegration(
    hospitalId: string,
    provider: IntegrationProvider,
    config: IntegrationConfig,
  ): Promise<boolean> {
    const encrypted = await encryptPatientInfo(JSON.stringify(config));

    const { error } = await supabase
      .from('hospital_integrations')
      .upsert(
        {
          hospital_id: hospitalId,
          provider,
          config: encrypted,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hospital_id,provider' },
      );

    if (error) {
      console.error('[integrationService] upsertIntegration failed:', error);
      return false;
    }
    return true;
  },

  /** 인테그레이션 연결 해제 (행 삭제) */
  async deleteIntegration(
    hospitalId: string,
    provider: IntegrationProvider,
  ): Promise<boolean> {
    const { error } = await supabase
      .from('hospital_integrations')
      .delete()
      .eq('hospital_id', hospitalId)
      .eq('provider', provider);

    if (error) {
      console.error('[integrationService] deleteIntegration failed:', error);
      return false;
    }
    return true;
  },

  /** 암호화된 config 복호화 */
  async decryptConfig<T extends IntegrationConfig>(encryptedConfig: string): Promise<T | null> {
    try {
      const json = await decryptPatientInfo(encryptedConfig);
      return JSON.parse(json) as T;
    } catch (err) {
      console.error('[integrationService] decryptConfig failed:', err);
      return null;
    }
  },

  /** 연결 테스트 (Edge Function 호출) */
  async testConnection(
    provider: IntegrationProvider,
    config: IntegrationConfig,
  ): Promise<{ ok: boolean; message: string }> {
    const { data, error } = await supabase.functions.invoke('test-integration', {
      body: { provider, config },
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    return data as { ok: boolean; message: string };
  },
};
