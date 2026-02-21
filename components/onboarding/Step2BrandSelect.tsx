import React from 'react';

export interface BrandTemplate {
  key: string;
  label: string;
  manufacturer: string;
  products: { brand: string; sizes: string[] }[];
}

export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    key: 'osstem',
    label: 'OSSTEM (오스템)',
    manufacturer: 'OSSTEM',
    products: [
      { brand: 'TSIII SA', sizes: ['Φ3.5 × 8.5', 'Φ3.5 × 10', 'Φ4.0 × 7', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ4.5 × 10', 'Φ5.0 × 8.5', 'Φ5.0 × 10'] },
      { brand: 'USII SA', sizes: ['Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ4.5 × 10', 'Φ5.0 × 8.5', 'Φ5.0 × 10'] },
      { brand: 'TSII SA', sizes: ['Φ3.5 × 8.5', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ5.0 × 8.5'] },
    ],
  },
  {
    key: 'ibs',
    label: 'IBS (아이비에스)',
    manufacturer: 'Magicore',
    products: [
      { brand: 'IBS Implant', sizes: ['Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.0 × 11.5', 'Φ4.5 × 8.5', 'Φ4.5 × 10', 'Φ5.0 × 7', 'Φ5.0 × 8.5', 'Φ5.0 × 10', 'Φ5.0 × 11.5'] },
    ],
  },
  {
    key: 'dentium',
    label: 'Dentium (덴티움)',
    manufacturer: 'Dentium',
    products: [
      { brand: 'SuperLine', sizes: ['Φ3.6 × 8.5', 'Φ3.6 × 10', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ4.5 × 10', 'Φ5.0 × 8.5', 'Φ5.0 × 10'] },
      { brand: 'IMPLANTIUM', sizes: ['Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ5.0 × 8.5'] },
    ],
  },
  {
    key: 'dio',
    label: 'DIO (디오)',
    manufacturer: '디오',
    products: [
      { brand: 'UF II', sizes: ['Φ3.8 × 8.5', 'Φ3.8 × 10', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ4.5 × 10', 'Φ5.0 × 8.5', 'Φ5.0 × 10'] },
      { brand: 'UF', sizes: ['Φ4.0 × 8.5', 'Φ4.5 × 8.5', 'Φ5.0 × 8.5'] },
    ],
  },
  {
    key: 'neobiotech',
    label: '네오바이오텍',
    manufacturer: '네오바이오텍',
    products: [
      { brand: 'IS-II Active', sizes: ['Φ3.5 × 8.5', 'Φ3.5 × 10', 'Φ4.0 × 7', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ5.0 × 8.5'] },
      { brand: 'IS-III Active', sizes: ['Φ3.5 × 8.5', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 10', 'Φ5.0 × 8.5'] },
    ],
  },
  {
    key: 'megagen',
    label: '메가젠 (Megagen)',
    manufacturer: '메가젠',
    products: [
      { brand: 'AnyRidge', sizes: ['Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ5.0 × 8.5', 'Φ5.0 × 10'] },
      { brand: 'AnyOne Internal', sizes: ['Φ3.5 × 8.5', 'Φ3.5 × 10', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ5.0 × 8.5'] },
    ],
  },
  {
    key: 'straumann',
    label: 'Straumann (스트라우만)',
    manufacturer: 'Straumann',
    products: [
      { brand: 'Bone Level Tapered, SLActive', sizes: ['Φ3.3 × 8', 'Φ3.3 × 10', 'Φ3.3 × 12', 'Φ4.1 × 8', 'Φ4.1 × 10', 'Φ4.8 × 8', 'Φ4.8 × 10'] },
      { brand: 'Bone Level, SLActive', sizes: ['Φ3.3 × 8', 'Φ4.1 × 8', 'Φ4.1 × 10', 'Φ4.8 × 8'] },
    ],
  },
  {
    key: 'dentis',
    label: '덴티스 (Dentis)',
    manufacturer: '덴티스',
    products: [
      { brand: 'i-Clean Tapered II-RBM', sizes: ['Φ3.5 × 8.5', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5', 'Φ5.0 × 8.5'] },
      { brand: 's-Clean Tapered II-RBM', sizes: ['Φ3.5 × 8.5', 'Φ4.0 × 8.5', 'Φ4.0 × 10', 'Φ4.5 × 8.5'] },
    ],
  },
];

interface Props {
  selected: string[];
  onChange: (keys: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2BrandSelect({ selected, onChange, onNext, onBack }: Props) {
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">사용 중인 브랜드를 선택하세요</h2>
      <p className="text-sm text-slate-500 mb-5">복수 선택 가능 · 나중에 추가/삭제 가능</p>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {BRAND_TEMPLATES.map(({ key, label }) => {
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`relative flex flex-col items-start px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 w-4.5 h-4.5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <span className={`text-xs font-bold leading-snug ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          이전
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          다음 {selected.length > 0 && `(${selected.length}개 선택)`}
        </button>
      </div>
    </div>
  );
}
