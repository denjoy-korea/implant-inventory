import React from 'react';
import { ContactInquiry, InquiryStatus, STATUS_COLORS, STATUS_LABELS } from '../../../services/contactService';

interface SystemAdminInquiriesTabProps {
  inquiries: ContactInquiry[];
  inquiriesLoading: boolean;
  selectedInquiry: ContactInquiry | null;
  inquiryStatusUpdating: string | null;
  onSelectInquiry: (inquiry: ContactInquiry) => void;
  onUpdateInquiryStatus: (inquiry: ContactInquiry, status: InquiryStatus) => void;
  onOpenReply: (inquiry: ContactInquiry) => void;
  onDeleteInquiry: (inquiry: ContactInquiry) => void;
}

const SystemAdminInquiriesTab: React.FC<SystemAdminInquiriesTabProps> = ({
  inquiries,
  inquiriesLoading,
  selectedInquiry,
  inquiryStatusUpdating,
  onSelectInquiry,
  onUpdateInquiryStatus,
  onOpenReply,
  onDeleteInquiry,
}) => {
  const pending = inquiries.filter((item) => item.status === 'pending').length;
  const inProgress = inquiries.filter((item) => item.status === 'in_progress').length;
  const resolved = inquiries.filter((item) => item.status === 'resolved').length;

  return (
    <div>
      {!inquiriesLoading && inquiries.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { label: '전체', value: `${inquiries.length}건`, highlight: false },
            { label: '접수', value: `${pending}건`, highlight: pending > 0 },
            { label: '처리중', value: `${inProgress}건`, highlight: false },
            { label: '완료', value: `${resolved}건`, highlight: false },
          ].map((summary, index) => (
            <div key={index} className={`rounded-xl border px-4 py-3 flex-1 min-w-[80px] ${summary.highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{summary.label}</p>
              <p className={`text-lg font-black ${summary.highlight ? 'text-amber-700' : 'text-slate-800'}`}>{summary.value}</p>
            </div>
          ))}
        </div>
      )}

      {inquiriesLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : inquiries.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">접수된 문의가 없습니다</div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-16rem)]">
          <div className="w-72 flex-shrink-0 overflow-y-auto space-y-2 pr-1">
            {inquiries.map((inquiry) => (
              <button
                key={inquiry.id}
                onClick={() => onSelectInquiry(inquiry)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedInquiry?.id === inquiry.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-800 truncate">{inquiry.hospital_name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[inquiry.status]}`}>{STATUS_LABELS[inquiry.status]}</span>
                </div>
                <p className="text-[10px] text-slate-500">{inquiry.inquiry_type} · {inquiry.contact_name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(inquiry.created_at).toLocaleDateString('ko-KR')}</p>
              </button>
            ))}
          </div>

          {selectedInquiry ? (
            <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedInquiry.hospital_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(selectedInquiry.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['pending', 'in_progress', 'resolved'] as InquiryStatus[]).map((status) => (
                    <button
                      key={status}
                      disabled={inquiryStatusUpdating === selectedInquiry.id}
                      onClick={() => onUpdateInquiryStatus(selectedInquiry, status)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${selectedInquiry.status === status ? `${STATUS_COLORS[status]} ring-1 ring-current` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: '담당자', value: selectedInquiry.contact_name },
                  { label: '직위', value: selectedInquiry.role || '-' },
                  { label: '이메일', value: selectedInquiry.email },
                  { label: '연락처', value: selectedInquiry.phone },
                  { label: '문의 유형', value: selectedInquiry.inquiry_type },
                  { label: '수술 건수', value: selectedInquiry.weekly_surgeries },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-bold text-slate-400 mb-2">상세 내용</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedInquiry.content}</p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => onOpenReply(selectedInquiry)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  이메일 답장
                </button>
                <button
                  onClick={() => onDeleteInquiry(selectedInquiry)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
              목록에서 문의를 선택하세요
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemAdminInquiriesTab;
