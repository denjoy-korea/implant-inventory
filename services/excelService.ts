import { ExcelData } from '../types';
import { supabase } from './supabaseClient';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function toBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 2MB를 초과합니다.');
  }

  const fileBase64 = await toBase64(file);
  const { data, error } = await supabase.functions.invoke('xlsx-parse', {
    body: {
      fileBase64,
      filename: file.name,
    },
  });

  if (error) {
    const raw = error.message || '';
    const detail = raw.includes('Failed to send a request to the Edge Function')
      ? 'Edge Function 연결 실패 (xlsx-parse 배포/프로젝트 URL/네트워크 확인 필요)'
      : raw || '서버에서 상세 오류를 반환하지 않았습니다.';
    throw new Error(`엑셀 파싱 실패: ${detail}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('엑셀 파싱 실패: 서버 응답 형식이 올바르지 않습니다.');
  }

  return data as ExcelData;
};

export const downloadExcelFile = async (data: ExcelData, selectedIndices: Set<number>, fileName: string): Promise<void> => {
  const activeSheet = data.sheets[data.activeSheetName];
  if (!activeSheet) {
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('엑셀 생성 실패: Supabase 환경변수가 설정되지 않았습니다.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? supabaseAnonKey;
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/xlsx-generate`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      activeSheet,
      selectedIndices: Array.from(selectedIndices),
      fileName,
    }),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody && typeof errBody === 'object' && 'error' in errBody && typeof errBody.error === 'string') {
        detail = errBody.error;
      }
    } catch {}
    throw new Error(`엑셀 생성 실패: ${detail}`);
  }

  const binaryData = await response.arrayBuffer();
  if (!(binaryData instanceof ArrayBuffer)) {
    throw new Error('엑셀 생성 실패: 서버 응답 형식이 올바르지 않습니다.');
  }

  const blob = new Blob([binaryData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeFileName = fileName?.trim() ? fileName : 'export.xlsx';
  const downloadUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(downloadUrl);
  }
};
