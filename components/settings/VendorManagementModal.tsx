import React from 'react';
import { VendorContact } from '../../types';
import ModalShell from '../shared/ModalShell';

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.startsWith('02')) {
    if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, '$1-$2').replace(/-$/, '');
    if (digits.length <= 9) return digits.replace(/(\d{2})(\d{3,4})(\d{0,4})/, '$1-$2-$3').replace(/-$/, '');
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  if (digits.length <= 7) return digits.replace(/(\d{3})(\d{0,4})/, '$1-$2').replace(/-$/, '');
  if (digits.length <= 10) return digits.replace(/(\d{3})(\d{3,4})(\d{0,4})/, '$1-$2-$3').replace(/-$/, '');
  return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

interface VendorManagementModalProps {
  manufacturers: string[];
  vendors: VendorContact[];
  isLoading: boolean;
  editingVendor: string | null;
  editRepName: string;
  setEditRepName: (v: string) => void;
  editPhone: string;
  setEditPhone: (v: string) => void;
  isSaving: boolean;
  deletingId: string | null;
  onStartEdit: (manufacturer: string) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: (contact: VendorContact) => void;
  onClose: () => void;
}

const VendorManagementModal: React.FC<VendorManagementModalProps> = ({
  manufacturers, vendors, isLoading, editingVendor,
  editRepName, setEditRepName, editPhone, setEditPhone,
  isSaving, deletingId, onStartEdit, onCancelEdit, onSave, onDelete, onClose,
}) => {
  const handleClose = () => {
    onClose();
    onCancelEdit();
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={handleClose}
      title="거래처 관리"
      titleId="vendor-management-title"
      maxWidth="max-w-lg"
      className="flex flex-col max-h-[80vh]"
      backdropClassName="flex items-center justify-center p-4 backdrop-blur-sm"
    >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 id="vendor-management-title" className="text-base font-bold text-slate-900">거래처 관리</h3>
            <p className="text-xs text-slate-500">제조사별 영업사원 연락처</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="거래처 관리 모달 닫기"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm">불러오는 중...</div>
          ) : manufacturers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              등록된 재고 품목이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {manufacturers.map(mfr => {
                const contact = vendors.find(v => v.manufacturer === mfr);
                const isEditing = editingVendor === mfr;

                if (isEditing) {
                  return (
                    <div key={mfr} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                      <p className="text-xs font-bold text-slate-700 mb-3">{mfr}</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">담당자명</label>
                          <input
                            type="text"
                            value={editRepName}
                            onChange={e => setEditRepName(e.target.value)}
                            placeholder="예) 김철수"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">전화번호</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={e => setEditPhone(formatPhoneNumber(e.target.value))}
                            placeholder="010-0000-0000"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={onCancelEdit}
                          className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={onSave}
                          disabled={isSaving || (!editRepName.trim() && !editPhone.trim())}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={mfr} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{mfr}</p>
                      {contact ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {contact.repName && <span className="font-medium text-slate-600">{contact.repName}</span>}
                          {contact.repName && contact.phone && <span className="mx-1.5 text-slate-300">·</span>}
                          {contact.phone && <span>{contact.phone}</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">연락처 미등록</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onStartEdit(mfr)}
                        className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        {contact ? '수정' : '등록'}
                      </button>
                      {contact && (
                        <button
                          onClick={() => onDelete(contact)}
                          disabled={deletingId === contact.id}
                          className="px-3 py-1 text-xs font-semibold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 disabled:opacity-40 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </ModalShell>
  );
};

export default VendorManagementModal;
