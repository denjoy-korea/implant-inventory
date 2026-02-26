
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InventoryItem } from '../types';
import { toCanonicalSize } from '../services/sizeNormalizer';
import { fixIbsImplant } from '../services/mappers';
import { isExchangePrefix } from '../services/appUtils';
import {
  DENTWEB_DEFAULTS,
  getDentwWebManufacturers,
  getDentwWebBrands,
  getDentwWebSizes,
} from '../services/dentweb-defaults';

interface AddItemModalProps {
  inventory: InventoryItem[];
  onAdd: (newItem: InventoryItem) => void;
  onClose: () => void;
}

function isSystemItem(item: InventoryItem): boolean {
  return isExchangePrefix(item.manufacturer) ||
    item.manufacturer === '보험청구' ||
    item.brand === '보험임플란트';
}

// 섹션 구분이 있는 제조사 목록 타입
export type ManufacturerOption =
  | { type: 'item'; value: string }
  | { type: 'divider'; label: string };

function mergeManufacturers(inventory: InventoryItem[]): ManufacturerOption[] {
  const fromDB = Array.from(new Set(
    inventory.filter(i => !isSystemItem(i)).map(i => i.manufacturer).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'ko'));

  const defaultSet = new Set(getDentwWebManufacturers());
  const dbSet = new Set(fromDB);

  // 기존 재고에 있는 제조사
  const existing = fromDB.filter(m => m);

  // 덴트웹 기본값 중 아직 재고에 없는 것
  const newDefaults = getDentwWebManufacturers()
    .filter(m => !dbSet.has(m))
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const result: ManufacturerOption[] = [];

  if (existing.length > 0) {
    existing.forEach(m => result.push({ type: 'item', value: m }));
    result.push({ type: 'divider', label: '신규 제조사 등록' });
  }

  newDefaults.forEach(m => result.push({ type: 'item', value: m }));

  return result;
}

function mergeBrands(manufacturer: string, inventory: InventoryItem[]): ManufacturerOption[] {
  const fromDB = Array.from(
    new Set(
      inventory
        .filter(i => !isSystemItem(i) && i.manufacturer === manufacturer)
        .map(i => i.brand)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ko'));

  const dbSet = new Set(fromDB);

  const newDefaults = getDentwWebBrands(manufacturer)
    .filter(b => !dbSet.has(b))
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const result: ManufacturerOption[] = [];

  if (fromDB.length > 0) {
    fromDB.forEach(b => result.push({ type: 'item', value: b }));
    result.push({ type: 'divider', label: '신규 브랜드 등록' });
  }

  newDefaults.forEach(b => result.push({ type: 'item', value: b }));

  return result;
}

function parseSizeTemplate(size: string): { diameter: string; length: string; cuff: string | null } | null {
  if (/^\d{4}[A-Z]*$/.test(size)) {
    const d = (parseInt(size.substring(0, 2)) / 10).toString();
    const l = parseInt(size.substring(2, 4)).toString();
    return { diameter: d, length: l, cuff: null };
  }
  if (/^\d{6}[A-Z]*$/.test(size)) {
    const d = (parseInt(size.substring(2, 4)) / 10).toString();
    const l = parseInt(size.substring(4, 6)).toString();
    return { diameter: d, length: l, cuff: null };
  }
  const phiMatch = size.match(/[Φφ]\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)(?:\s*[×xX*]\s*(\d+\.?\d*))?/);
  if (phiMatch) {
    return { diameter: phiMatch[1], length: phiMatch[2], cuff: phiMatch[3] ?? null };
  }
  const oslashMmMatch = size.match(/[Øø]\s*(\d+\.?\d*)\s*[xX×]\s*0?(\d+\.?\d*)\s*mm/i);
  if (oslashMmMatch) {
    return { diameter: oslashMmMatch[1], length: oslashMmMatch[2], cuff: null };
  }
  const oslashLMatch = size.match(/[Øø]\s*(\d+\.?\d*)\s*\/\s*L\s*(\d+\.?\d*)/i);
  if (oslashLMatch) {
    return { diameter: oslashLMatch[1], length: oslashLMatch[2], cuff: null };
  }
  const cuffPhiMatch = size.match(/^(C\d+)\s*[Φφ]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/i);
  if (cuffPhiMatch) {
    return { diameter: cuffPhiMatch[2], length: cuffPhiMatch[3], cuff: cuffPhiMatch[1] };
  }
  return null;
}

function getSizeFormatLabel(manufacturer: string, brand: string): string {
  const sizes = getDentwWebSizes(manufacturer, brand);
  if (!sizes.length) return 'D___ L___';
  const sample = sizes[0];
  const parsed = parseSizeTemplate(sample);
  if (!parsed) return sample;
  if (parsed.cuff) return `Cuff / D___ × L___`;
  return `D___ × L___`;
}

// Combobox 컴포넌트 (string[] 또는 ManufacturerOption[] 모두 지원)
function Combobox({
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  options: string[] | ManufacturerOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // string[] 여부 확인
  const isStringArray = options.length === 0 || typeof options[0] === 'string';

  // 필터링된 목록 (ManufacturerOption 포함)
  const filtered = useMemo(() => {
    if (isStringArray) {
      const opts = options as string[];
      if (!query) return opts.map(v => ({ type: 'item' as const, value: v }));
      const q = query.toLowerCase();
      return opts
        .filter(o => o.toLowerCase().includes(q))
        .map(v => ({ type: 'item' as const, value: v }));
    }
    const opts = options as ManufacturerOption[];
    if (!query) return opts;
    const q = query.toLowerCase();
    // 검색 시 divider 제거하고 매칭되는 항목만
    return opts.filter(o => o.type === 'item' && o.value.toLowerCase().includes(q));
  }, [query, options, isStringArray]);

  const hasItems = filtered.some(o => o.type === 'item');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
          disabled
            ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
            : open
            ? 'bg-white border-slate-400 ring-2 ring-slate-100'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none min-w-0"
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (!disabled) setOpen(true); }}
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {!hasItems ? (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center">
                &quot;{query}&quot; — 직접 입력으로 추가
              </div>
            ) : (
              filtered.map((opt, idx) => {
                if (opt.type === 'divider') {
                  return (
                    <div key={`divider-${idx}`} className="flex items-center gap-2 px-3 py-1.5">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">{opt.label}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  );
                }
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      opt.value === value
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setQuery(opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.value}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 규격 선택 컴포넌트
function SizeSelector({
  manufacturer,
  brand,
  value,
  onChange,
}: {
  manufacturer: string;
  brand: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const sizes = useMemo(
    () => getDentwWebSizes(manufacturer, brand),
    [manufacturer, brand]
  );
  const hasSizes = sizes.length > 0;

  return (
    <div>
      {hasSizes ? (
        <Combobox
          value={value}
          options={sizes}
          onChange={onChange}
          placeholder={`예: ${sizes[0]}`}
        />
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="규격 직접 입력 (예: D4.0 L10)"
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-400">
        {hasSizes
          ? `목록에서 선택하거나 직접 입력하세요`
          : '제조사/브랜드 선택 시 덴트웹 기본 목록이 나타납니다'
        }
      </p>
    </div>
  );
}

const AddItemModal: React.FC<AddItemModalProps> = ({ inventory, onAdd, onClose }) => {
  const [manufacturer, setManufacturer] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [initialStock, setInitialStock] = useState(10);
  const [error, setError] = useState('');

  const manufacturers = useMemo(() => mergeManufacturers(inventory), [inventory]);
  const brands = useMemo(
    () => (manufacturer ? mergeBrands(manufacturer, inventory) : []),
    [manufacturer, inventory]
  );

  const handleManufacturerChange = (v: string) => {
    setManufacturer(v);
    setBrand('');
    setSize('');
    setError('');
  };

  const handleBrandChange = (v: string) => {
    setBrand(v);
    setSize('');
    setError('');
  };

  const handleSubmit = () => {
    if (!manufacturer.trim()) { setError('제조사를 입력해주세요.'); return; }
    if (!brand.trim()) { setError('브랜드를 입력해주세요.'); return; }
    if (!size.trim()) { setError('규격을 입력해주세요.'); return; }
    if (initialStock < 0) { setError('기초 재고는 0 이상이어야 합니다.'); return; }

    const fixed = fixIbsImplant(manufacturer.trim(), brand.trim());
    const normalizedSize = toCanonicalSize(size.trim(), fixed.manufacturer);

    const duplicate = inventory.find(
      i => i.manufacturer === fixed.manufacturer &&
           i.brand === fixed.brand &&
           i.size === normalizedSize
    );
    if (duplicate) {
      setError('동일한 제조사/브랜드/규격이 이미 등록되어 있습니다.');
      return;
    }

    onAdd({
      id: `manual_${Date.now()}`,
      manufacturer: fixed.manufacturer,
      brand: fixed.brand,
      size: normalizedSize,
      initialStock,
      stockAdjustment: 0,
      usageCount: 0,
      currentStock: initialStock,
      recommendedStock: 5,
      monthlyAvgUsage: 0,
      dailyMaxUsage: 0,
    });
  };

  const step = manufacturer ? (brand ? (size ? 3 : 2) : 1) : 0;
  const canSubmit = !!manufacturer && !!brand && !!size;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-[480px] rounded-xl shadow-2xl overflow-hidden flex flex-col">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">품목 수동 추가</h3>
            <p className="text-xs text-slate-400 mt-0.5">덴트웹 기본값 기준으로 등록합니다</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center px-6 py-3 bg-slate-50 border-b border-slate-100">
          {['제조사', '브랜드', '규격'].map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                    step > i
                      ? 'bg-slate-800 text-white'
                      : step === i
                      ? 'bg-white border-2 border-slate-800 text-slate-800'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  {step > i ? (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs font-medium transition-all ${
                  step > i ? 'text-slate-700' : step === i ? 'text-slate-900 font-semibold' : 'text-slate-400'
                }`}>
                  {s}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-px mx-3 transition-all ${step > i ? 'bg-slate-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 폼 */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[55vh]">

          {/* 제조사 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">제조사</label>
            <Combobox
              value={manufacturer}
              options={manufacturers}
              onChange={handleManufacturerChange}
              placeholder="제조사 선택 또는 직접 입력"
            />
          </div>

          {/* 브랜드 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">브랜드</label>
            <Combobox
              value={brand}
              options={brands}
              onChange={handleBrandChange}
              placeholder={manufacturer ? '브랜드 선택 또는 직접 입력' : '제조사를 먼저 선택하세요'}
              disabled={!manufacturer}
            />
          </div>

          {/* 규격 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">규격</label>
            <SizeSelector
              manufacturer={manufacturer}
              brand={brand}
              value={size}
              onChange={v => { setSize(v); setError(''); }}
            />
          </div>

          {/* 기초 재고 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">기초 재고</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInitialStock(s => Math.max(0, s - 1))}
                className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center text-base font-medium transition-all flex-shrink-0"
              >
                −
              </button>
              <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white">
                <input
                  type="number"
                  min={0}
                  value={initialStock}
                  onChange={e => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none text-center tabular-nums"
                />
                <span className="text-xs text-slate-400 flex-shrink-0 ml-1">개</span>
              </div>
              <button
                type="button"
                onClick={() => setInitialStock(s => s + 1)}
                className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center text-base font-medium transition-all flex-shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* 등록 예정 미리보기 */}
          {canSubmit && (
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">등록 예정 품목</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{manufacturer} · {brand}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    규격 <span className="font-mono text-slate-700">{size}</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    기초 재고 <span className="font-semibold text-slate-700">{initialStock}개</span>
                  </p>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
          >
            추가 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
