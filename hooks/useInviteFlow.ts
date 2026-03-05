import { useEffect, useState } from 'react';
import React from 'react';
import { AppState } from '../types';
import { supabase } from '../services/supabaseClient';

interface InviteInfo {
  token: string;
  email: string;
  name: string;
  hospitalName: string;
}

export function useInviteFlow(
  user: AppState['user'],
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  showAlertToast: (msg: string, type: 'success' | 'error' | 'info') => void,
) {
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [processingInvite, setProcessingInvite] = useState(false);

  // URL ?invite=TOKEN 감지 → verify-invite Edge Function으로 검증 후 초대 수락 뷰로 전환
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token) return;

    // URL에서 토큰 파라미터 즉시 제거 (보안 + 중복 실행 방지)
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url.toString());

    // 이미 로그인된 사용자: 토큰 검증 후 accept-invite 자동 호출
    if (user) {
      setProcessingInvite(true);
      supabase.functions.invoke('verify-invite', { body: { token } })
        .then(async ({ data, error }) => {
          if (error || !data || data.error) {
            showAlertToast('유효하지 않거나 만료된 초대입니다.', 'error');
            setProcessingInvite(false);
            return;
          }
          // 이미 해당 병원에 소속된 경우 스킵
          if (user.hospitalId) {
            showAlertToast('이미 병원에 소속되어 있습니다.', 'info');
            setProcessingInvite(false);
            return;
          }
          const { data: { session } } = await supabase.auth.getSession();
          const { data: acceptData, error: acceptError } = await supabase.functions.invoke('accept-invite', {
            body: { token, userId: user.id },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
          });
          if (acceptError || acceptData?.error) {
            showAlertToast(acceptData?.error || '초대 수락에 실패했습니다.', 'error');
            setProcessingInvite(false);
            return;
          }
          showAlertToast(`${data.hospitalName}에 합류되었습니다!`, 'success');
          // 세션 새로고침하여 병원 데이터 로드
          window.location.reload();
        })
        .catch(() => setProcessingInvite(false));
      return;
    }

    // 비로그인 사용자: 초대 수락 폼으로 전환
    supabase.functions.invoke('verify-invite', { body: { token } })
      .then(({ data, error }) => {
        if (error || !data || data.error) {
          setState(prev => ({ ...prev, currentView: 'login' }));
          return;
        }
        setInviteInfo({ token, email: data.email, name: data.name, hospitalName: data.hospitalName });
        setState(prev => ({ ...prev, currentView: 'invite' }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { inviteInfo, processingInvite };
}
