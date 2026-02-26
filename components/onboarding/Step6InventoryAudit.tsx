import { useState } from 'react';

interface Props {
  onGoToBaseStockEdit: () => void;
}

const STEPS = [
  { step: '1', label: '재고 관리 마스터 진입 → 기초재고 편집 클릭' },
  { step: '2', label: '각 품목의 현재 보유 수량 직접 입력' },
  { step: '3', label: '저장 완료 — 발주 권장 수량 계산 활성화' },
];

export default function Step6InventoryAudit({ onGoToBaseStockEdit }: Props) {
  const [showQr, setShowQr] = useState(false);

  const appUrl = window.location.origin;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(appUrl)}&margin=8&color=4338ca`;

  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <h2 className="text-xl font-black text-slate-900 mb-1">기초재고 등록</h2>
      <p className="text-sm text-slate-500 mb-5">
        현재 실제로 보유한 재고 수량을 입력하면<br />
        발주 및 재고 관리가 시작됩니다.
      </p>

      <div className="space-y-2 mb-4 flex-1">
        {STEPS.map(({ step, label }) => (
          <div key={step} className="flex items-center gap-4 bg-slate-50 rounded-2xl px-5 py-3.5">
            <span className="text-xs font-black text-indigo-500 w-5 shrink-0">{step}</span>
            <p className="text-sm text-slate-700 flex-1">{label}</p>
          </div>
        ))}

        {/* 스마트폰 QR 접속 */}
        <div className="bg-slate-50 rounded-2xl px-5 py-3.5">
          <button
            onClick={() => setShowQr(v => !v)}
            className="w-full flex items-center gap-3 text-left"
          >
            <span className="text-xs font-black text-indigo-500 w-5 shrink-0">📱</span>
            <p className="text-sm text-slate-700 flex-1">
              스마트폰으로 창고에서 직접 입력하려면
            </p>
            <svg
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showQr ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showQr && (
            <div className="mt-3 flex items-center gap-4">
              <img
                src={qrSrc}
                alt="앱 접속 QR 코드"
                width={80}
                height={80}
                className="rounded-xl border border-slate-200 shrink-0"
              />
              <div>
                <p className="text-xs font-bold text-slate-700 mb-0.5">QR 스캔 후 로그인</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  같은 계정으로 로그인하면<br />
                  진행 상태가 그대로 이어집니다.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono break-all">{appUrl}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          지금 창고에 있는 수량을 그대로 입력하면 정확한 발주 권장량을 계산할 수 있습니다.
        </p>
      </div>

      <button
        onClick={onGoToBaseStockEdit}
        className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        기초재고 편집 시작
      </button>
    </div>
  );
}
