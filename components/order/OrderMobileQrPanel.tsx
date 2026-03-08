import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  orderUrl: string;
}

const OrderMobileQrPanel: React.FC<Props> = ({ orderUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — no-op
    }
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div>
        <p className="text-sm font-black text-slate-900">현장 주문 관리</p>
        <p className="text-[11px] text-slate-500 mt-0.5">스마트폰으로 QR 코드를 스캔하면 모바일 주문관리 화면으로 바로 이동합니다.</p>
      </div>

      <div className="flex items-center gap-5">
        {/* QR Code */}
        <div className="shrink-0 p-2 border border-slate-100 rounded-xl bg-white shadow-sm">
          <QRCodeSVG
            value={orderUrl}
            size={104}
            bgColor="#ffffff"
            fgColor="#1e293b"
            level="M"
          />
        </div>

        {/* Instructions */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex flex-col gap-1.5">
            {[
              '스마트폰 카메라로 QR 스캔',
              '로그인 후 주문관리 화면 자동 이동',
              '현장에서 발주 및 수령 등록 진행',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-[11px] text-slate-600 font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* URL copy */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all self-start ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                복사됨
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                URL 복사
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderMobileQrPanel;
