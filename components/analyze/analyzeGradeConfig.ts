export const GRADE_CONFIG = {
  A: { label: 'A', color: 'emerald', text: '데이터 관리가 우수합니다', min: 80 },
  B: { label: 'B', color: 'amber', text: '개선하면 더 좋아집니다', min: 60 },
  C: { label: 'C', color: 'orange', text: '상당한 개선이 필요합니다', min: 40 },
  D: { label: 'D', color: 'rose', text: '데이터 관리 체계 재검토가 필요합니다', min: 0 },
} as const;

export const gradeColorMap: Record<string, { bg: string; text: string; border: string; light: string; stroke: string }> = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', light: 'bg-emerald-50', stroke: '#10b981' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50', stroke: '#f59e0b' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-200', light: 'bg-orange-50', stroke: '#f97316' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50', stroke: '#f43f5e' },
};

export const statusColorMap = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓', iconBg: 'bg-emerald-100 text-emerald-600' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '!', iconBg: 'bg-amber-100 text-amber-600' },
  critical: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '✕', iconBg: 'bg-rose-100 text-rose-600' },
};

export function getGrade(score: number) {
  if (score >= 80) return GRADE_CONFIG.A;
  if (score >= 60) return GRADE_CONFIG.B;
  if (score >= 40) return GRADE_CONFIG.C;
  return GRADE_CONFIG.D;
}
