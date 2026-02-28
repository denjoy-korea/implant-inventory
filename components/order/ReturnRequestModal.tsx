import React, { useState } from 'react';
import {
  ReturnReason,
  RETURN_REASON_LABELS,
  InventoryItem,
} from '../../types';

interface ReturnItem {
  brand: string;
  size: string;
  quantity: number;
}

interface ReturnRequestModalProps {
  inventory: InventoryItem[];
  currentUserName: string;
  onConfirm: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: ReturnItem[];
  }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  inventory,
  currentUserName,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  const [manufacturer, setManufacturer] = useState('');
  const [reason, setReason] = useState<ReturnReason>('excess_stock');
  const [manager, setManager] = useState(currentUserName);
  const [memo, setMemo] = useState('');
  const [items, setItems] = useState<ReturnItem[]>([
    { brand: '', size: '', quantity: 1 },
  ]);

  const manufacturers = Array.from(new Set(inventory.map(i => i.manufacturer))).sort();

  const brandsForMfr = Array.from(
    new Set(inventory.filter(i => i.manufacturer === manufacturer).map(i => i.brand))
  ).sort();

  const sizesForBrand = (brand: string) =>
    Array.from(
      new Set(
        inventory
          .filter(i => i.manufacturer === manufacturer && i.brand === brand)
          .map(i => i.size)
      )
    ).sort();

  const updateItem = (index: number, field: keyof ReturnItem, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      if (field === 'brand') {
        next[index] = { ...next[index], brand: value as string, size: '' };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const addItem = () =>
    setItems(prev => [...prev, { brand: '', size: '', quantity: 1 }]);

  const removeItem = (index: number) =>
    setItems(prev => prev.filter((_, i) => i !== index));

  const isValid =
    manufacturer &&
    reason &&
    manager.trim() &&
    items.length > 0 &&
    items.every(it => it.brand && it.size && it.quantity > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm({ manufacturer, reason, manager: manager.trim(), memo: memo.trim(), items });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">반품 신청</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* 제조사 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              제조사 <span className="text-red-500">*</span>
            </label>
            <select
              value={manufacturer}
              onChange={e => {
                setManufacturer(e.target.value);
                setItems([{ brand: '', size: '', quantity: 1 }]);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">제조사 선택</option>
              {manufacturers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 반품 사유 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              반품 사유 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][]).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setReason(k)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    reason === k
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* 담당자 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              담당자 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={manager}
              onChange={e => setManager(e.target.value)}
              placeholder="담당자 이름"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 반품 품목 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">
                반품 품목 <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + 품목 추가
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={item.brand}
                    onChange={e => updateItem(idx, 'brand', e.target.value)}
                    disabled={!manufacturer}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">브랜드</option>
                    {brandsForMfr.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <select
                    value={item.size}
                    onChange={e => updateItem(idx, 'size', e.target.value)}
                    disabled={!item.brand}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">사이즈</option>
                    {sizesForBrand(item.brand).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              rows={2}
              placeholder="특이사항이 있으면 입력하세요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '처리 중...' : '반품 신청'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnRequestModal;
