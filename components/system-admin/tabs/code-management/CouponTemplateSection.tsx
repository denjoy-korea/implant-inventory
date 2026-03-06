import React, { useState } from 'react';
import { CouponTemplate } from '../../../../services/couponService';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('ko-KR', { hour12: false });
}

interface CouponTemplateSectionProps {
  templates: CouponTemplate[];
  templatesLoading: boolean;
  onCreateTemplate: (params: {
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses: number;
    validDays: number | null;
  }) => Promise<void>;
  onToggleTemplate: (tpl: CouponTemplate) => Promise<void>;
}

function getDefaultExpiryDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function calcDaysFromToday(dateStr: string): number {
  const target = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

const CouponTemplateSection: React.FC<CouponTemplateSectionProps> = ({
  templates,
  templatesLoading,
  onCreateTemplate,
  onToggleTemplate,
}) => {
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplDiscountType, setTplDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [tplDiscountValue, setTplDiscountValue] = useState<number>(20);
  const [tplMaxUses, setTplMaxUses] = useState<number>(10);
  const [tplExpiryDate, setTplExpiryDate] = useState(getDefaultExpiryDate);
  const [tplUnlimited, setTplUnlimited] = useState(false);

  const handleCreateTemplate = async () => {
    setCreatingTemplate(true);
    try {
      await onCreateTemplate({
        name: tplName.trim(),
        description: tplDescription.trim() || undefined,
        discountType: tplDiscountType,
        discountValue: tplDiscountValue,
        maxUses: tplMaxUses,
        validDays: tplUnlimited ? null : calcDaysFromToday(tplExpiryDate),
      });
      setShowTemplateForm(false);
      setTplName('');
      setTplDescription('');
      setTplDiscountType('percentage');
      setTplDiscountValue(20);
      setTplMaxUses(10);
      setTplExpiryDate(getDefaultExpiryDate());
      setTplUnlimited(false);
    } finally {
      setCreatingTemplate(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800">쿠폰 템플릿</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">제휴/프로모 코드에 연결할 할인 쿠폰 규칙을 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplateForm((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
        >
          {showTemplateForm ? '닫기' : '템플릿 추가'}
        </button>
      </div>

      {showTemplateForm && (
        <div className="px-5 py-4 border-b border-slate-100 bg-violet-50/50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="템플릿 이름 * (예: 제휴 20% 할인)"
              className="w-full rounded-xl border border-violet-300 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <input
              value={tplDescription}
              onChange={(e) => setTplDescription(e.target.value)}
              placeholder="설명 (선택)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">할인 유형</label>
              <select
                value={tplDiscountType}
                onChange={(e) => setTplDiscountType(e.target.value as 'percentage' | 'fixed_amount')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              >
                <option value="percentage">정률 (%)</option>
                <option value="fixed_amount">정액 (원)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                할인 값 {tplDiscountType === 'percentage' ? '(%)' : '(원)'}
              </label>
              <input
                type="number"
                value={tplDiscountValue}
                onChange={(e) => setTplDiscountValue(Number(e.target.value))}
                min={1}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">최대 사용 횟수</label>
              <input
                type="number"
                value={tplMaxUses}
                onChange={(e) => setTplMaxUses(Number(e.target.value))}
                min={1}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">유효기간</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tplUnlimited ? '' : tplExpiryDate}
                  onChange={(e) => { setTplExpiryDate(e.target.value); setTplUnlimited(false); }}
                  min={new Date().toISOString().slice(0, 10)}
                  disabled={tplUnlimited}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tplUnlimited}
                  onChange={(e) => setTplUnlimited(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                />
                <span className="text-[11px] text-slate-500">무제한</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreateTemplate()}
              disabled={creatingTemplate}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {creatingTemplate ? '생성 중...' : '템플릿 생성'}
            </button>
          </div>
        </div>
      )}

      {templatesLoading ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : templates.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">등록된 쿠폰 템플릿이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">이름</th>
                <th className="px-4 py-3 text-left font-bold">할인</th>
                <th className="px-4 py-3 text-left font-bold">최대 사용</th>
                <th className="px-4 py-3 text-left font-bold">유효기간</th>
                <th className="px-4 py-3 text-left font-bold">상태</th>
                <th className="px-4 py-3 text-left font-bold">생성일</th>
                <th className="px-4 py-3 text-right font-bold">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((tpl) => (
                <tr key={tpl.id} className="text-slate-700">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{tpl.name}</p>
                    {tpl.description && <p className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold border bg-violet-50 text-violet-700 border-violet-200">
                      {tpl.discount_type === 'percentage' ? `${tpl.discount_value}%` : `${tpl.discount_value.toLocaleString()}원`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{tpl.max_uses}회</td>
                  <td className="px-4 py-3">
                    {tpl.valid_days
                      ? (() => {
                          const d = new Date(tpl.created_at);
                          d.setDate(d.getDate() + tpl.valid_days);
                          return `~${d.toLocaleDateString('ko-KR')} (${tpl.valid_days}일)`;
                        })()
                      : '무제한'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${tpl.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {tpl.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{formatDateTime(tpl.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void onToggleTemplate(tpl)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${tpl.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      {tpl.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CouponTemplateSection;
