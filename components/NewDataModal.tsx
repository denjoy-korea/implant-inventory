
import React, { useState } from 'react';
import { ExcelRow } from '../types';

interface NewDataModalProps {
  onClose: () => void;
  onSave: (rows: ExcelRow[]) => void;
}

interface TempRow {
  manufacturer: string;
  brand: string;
  size: string;
  unused: boolean;
}

const NewDataModal: React.FC<NewDataModalProps> = ({ onClose, onSave }) => {
  const [rows, setRows] = useState<TempRow[]>([
    { manufacturer: '', brand: '', size: '', unused: false }
  ]);

  const addRow = () => {
    setRows([...rows, { manufacturer: '', brand: '', size: '', unused: false }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof TempRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleSave = () => {
    // Basic validation: at least one field should be filled in each row
    const validatedRows = rows
      .filter(r => r.manufacturer.trim() || r.brand.trim() || r.size.trim())
      .map(r => ({
        '제조사': r.manufacturer,
        '브랜드': r.brand,
        '사이즈': r.size,
        '사용안함': r.unused
      }));

    if (validatedRows.length === 0) {
      alert("입력된 데이터가 없습니다.");
      return;
    }

    onSave(validatedRows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">신규 자료 입력</h3>
            <p className="text-xs text-slate-500 mt-0.5">새로운 데이터를 수동으로 추가합니다.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-2">제조사</th>
                <th className="pb-3 px-2">브랜드</th>
                <th className="pb-3 px-2">사이즈</th>
                <th className="pb-3 px-2 text-center w-20">사용안함</th>
                <th className="pb-3 px-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {rows.map((row, index) => (
                <tr key={index} className="group">
                  <td className="py-1 px-1">
                    <input 
                      type="text" 
                      placeholder="제조사 입력"
                      value={row.manufacturer}
                      onChange={(e) => updateRow(index, 'manufacturer', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input 
                      type="text" 
                      placeholder="브랜드 입력"
                      value={row.brand}
                      onChange={(e) => updateRow(index, 'brand', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input 
                      type="text" 
                      placeholder="사이즈 입력"
                      value={row.size}
                      onChange={(e) => updateRow(index, 'size', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <div className="flex justify-center">
                      <input 
                        type="checkbox" 
                        checked={row.unused}
                        onChange={(e) => updateRow(index, 'unused', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-red-500 focus:ring-red-500 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="py-1 px-1 text-right">
                    <button 
                      onClick={() => removeRow(index)}
                      disabled={rows.length <= 1}
                      className={`p-2 rounded-lg transition-all ${rows.length <= 1 ? 'text-slate-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button 
            onClick={addRow}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            행 추가 (추가등록)
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-all"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            데이터 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewDataModal;
