// G2/D1 — V2 온보딩 전용 (현재 미사용). fixture-upload 방식으로 대체됨. 삭제 금지.
import React, { useState, useMemo } from 'react';
import { BRAND_TEMPLATES } from './Step2BrandSelect';
import { OnboardingStockItem } from '../../services/onboardingService';

interface Props {
  selectedBrands: string[];
  onNext: (items: OnboardingStockItem[]) => void;
  onBack: () => void;
}

export default function Step3StockInput({ selectedBrands, onNext, onBack }: Props) {
  const templates = useMemo(
    () => BRAND_TEMPLATES.filter(t => selectedBrands.includes(t.key)),
    [selectedBrands]
  );

  // key: `${manufacturer}|${brand}|${size}` → quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const itemKey = (manufacturer: string, brand: string, size: string) =>
    `${manufacturer}|${brand}|${size}`;

  const setQty = (manufacturer: string, brand: string, size: string, value: number) => {
    setQuantities(prev => ({ ...prev, [itemKey(manufacturer, brand, size)]: Math.max(0, value) }));
  };

  const totalCount = Object.values(quantities).filter(v => v > 0).length;

  const handleNext = () => {
    const items: OnboardingStockItem[] = [];
    templates.forEach(t => {
      t.products.forEach(p => {
        p.sizes.forEach(size => {
          const qty = quantities[itemKey(t.manufacturer, p.brand, size)] ?? 0;
          if (qty > 0) {
            items.push({ manufacturer: t.manufacturer, brand: p.brand, size, quantity: qty });
          }
        });
      });
    });
    onNext(items);
  };

  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">현재 재고 수량을 입력하세요</h2>
      <p className="text-sm text-slate-500 mb-5">0인 항목은 건너뜁니다 · 나중에 상세 수정 가능</p>

      <div className="space-y-5 mb-6 max-h-[45vh] overflow-y-auto pr-1">
        {templates.map(template => (
          <div key={template.key}>
            <div className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">
              {template.label}
            </div>
            {template.products.map(product => (
              <div key={product.brand} className="mb-3">
                <div className="text-xs font-bold text-slate-500 mb-1.5">{product.brand}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {product.sizes.map(size => {
                    const qty = quantities[itemKey(template.manufacturer, product.brand, size)] ?? 0;
                    return (
                      <div
                        key={size}
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 border ${
                          qty > 0 ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <span className="text-xs text-slate-600 font-medium truncate">{size}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setQty(template.manufacturer, product.brand, size, qty - 1)}
                            className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-500 text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={qty === 0 ? '' : qty}
                            placeholder="0"
                            onChange={e => setQty(template.manufacturer, product.brand, size, Number(e.target.value) || 0)}
                            className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent outline-none"
                          />
                          <button
                            onClick={() => setQty(template.manufacturer, product.brand, size, qty + 1)}
                            className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-500 text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          이전
        </button>
        <button
          onClick={handleNext}
          className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          {totalCount > 0 ? `${totalCount}종 등록 후 다음` : '건너뛰기'}
        </button>
      </div>
    </div>
  );
}
