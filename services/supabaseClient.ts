import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function initSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.PROD) {
      throw new Error(
        '[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. ' +
        '프로덕션 환경에서는 반드시 환경변수를 설정해야 합니다.'
      );
    }
    console.warn(
      '[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. ' +
      'localStorage 전용 모드로 동작합니다. .env.local 파일을 확인하세요.'
    );
    // 개발 환경: 더미 URL로 클라이언트 생성 (API 호출은 실패하지만 앱 부팅은 가능)
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = initSupabase();
