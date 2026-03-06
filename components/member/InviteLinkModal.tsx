import React from 'react';
import ModalShell from '../shared/ModalShell';

interface InviteLinkModalPayload {
  url: string;
  name: string;
  email: string;
}

interface InviteLinkModalProps {
  invite: InviteLinkModalPayload | null;
  onClose: () => void;
  onCopy: (url: string) => void;
}

const InviteLinkModal: React.FC<InviteLinkModalProps> = ({ invite, onClose, onCopy }) => {
  return (
    <ModalShell
      isOpen={!!invite}
      onClose={onClose}
      title="초대 이메일 발송 완료"
      maxWidth="max-w-md"
      zIndex={120}
    >
      {invite && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">초대 이메일 발송 완료</h3>
              <p className="text-sm text-slate-500">{invite.name}님 ({invite.email})</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">초대 이메일이 발송되었습니다. 아래 링크를 직접 공유할 수도 있습니다.</p>
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 mb-5">
            <p className="flex-1 text-xs text-slate-500 truncate">{invite.url}</p>
            <button
              onClick={() => onCopy(invite.url)}
              className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              복사
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            확인
          </button>
        </div>
      )}
    </ModalShell>
  );
};

export default InviteLinkModal;
