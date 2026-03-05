interface SubmitAnalyzeLeadReportParams {
  supabaseUrl: string;
  supabaseAnonKey: string;
  signal: AbortSignal;
  leadEmail: string;
  gradeLabel: string;
  score: number;
  reportText: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
}

async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (payload && typeof payload === 'object') {
      if ('error' in payload && typeof payload.error === 'string') return payload.error;
      if ('message' in payload && typeof payload.message === 'string') return payload.message;
    }
  } catch {
    // ignore body parse errors
  }
  return '';
}

function buildHttpError(status: number, detail: string): Error & { status?: number } {
  const error = new Error(detail || `HTTP_${status}`) as Error & { status?: number };
  error.status = status;
  return error;
}

export async function submitAnalyzeLeadReport({
  supabaseUrl,
  supabaseAnonKey,
  signal,
  leadEmail,
  gradeLabel,
  score,
  reportText,
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
}: SubmitAnalyzeLeadReportParams): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-analysis-report`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email: leadEmail,
      grade: gradeLabel,
      score,
      reportText,
      isDetailed: wantDetailedAnalysis,
      hospitalName: leadHospital || undefined,
      region: leadRegion || undefined,
      contact: leadContact || undefined,
    }),
  });

  if (!response.ok) {
    const detail = await extractErrorDetail(response);
    throw buildHttpError(response.status, detail);
  }
}

export async function tryCopyReportText(reportText: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(reportText);
  } catch {
    // silent
  }
}
