import React, { useState } from 'react';
import type { PlanType } from '../../types';
import type { LowStockEntry } from '../../hooks/useOrderManagerData';
import { planService } from '../../services/planService';
import { displayMfr } from '../../hooks/useOrderManagerData';

interface Props {
  groupedLowStock: [string, LowStockEntry[]][];
  plan: PlanType;
}

function buildOrderText(groupedLowStock: [string, LowStockEntry[]][]): string {
  if (groupedLowStock.length === 0) return '';
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const lines: string[] = [`[발주 요청] ${dateStr}`, ''];
  groupedLowStock.forEach(([mfr, entries]) => {
    lines.push(`■ ${displayMfr(mfr)}`);
    entries.forEach(({ item, remainingDeficit }) => {
      const qty = Math.max(remainingDeficit, 1);
      lines.push(`  · ${item.brand} ${item.size} × ${qty}개`);
    });
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

const SimpleOrderCopyButton: React.FC<Props> = ({ groupedLowStock, plan }) => {
  const [copied, setCopied] = useState(false);

  if (!planService.canAccess(plan, 'simple_order')) return null;
  if (groupedLowStock.length === 0) return null;

  const handleCopy = async () => {
    const text = buildOrderText(groupedLowStock);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원 환경 대비
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] border ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50'
      }`}
      title="발주 목록을 클립보드에 복사 → 카카오톡 등에 붙여넣기"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          복사 완료
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          간편발주 복사
        </>
      )}
    </button>
  );
};

export default SimpleOrderCopyButton;
