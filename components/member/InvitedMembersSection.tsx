import React from 'react';
import { CLINIC_ROLE_LABELS, ClinicRole } from '../../types';

interface InvitedMember {
  id: string;
  email: string;
  name: string;
  clinic_role: ClinicRole | null;
  created_at: string;
  expires_at: string;
}

interface InvitedMembersSectionProps {
  invitedMembers: InvitedMember[];
  onResendInvitation: (invitedMember: InvitedMember) => void;
  onDeleteInvitation: (invitationId: string, name: string) => void;
}

const InvitedMembersSection: React.FC<InvitedMembersSectionProps> = ({
  invitedMembers,
  onResendInvitation,
  onDeleteInvitation,
}) => {
  if (invitedMembers.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
        초대 이메일 발송 완료 <span className="text-indigo-500">{invitedMembers.length}</span>
        <span className="text-xs font-normal text-slate-400 ml-1">— 아직 가입 대기 중</span>
      </h3>
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-indigo-100/50">
            {invitedMembers.map((invitedMember) => (
              <tr key={invitedMember.id} className="hover:bg-indigo-100/20">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xs flex-shrink-0">
                      {invitedMember.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700 text-sm">{invitedMember.name}</div>
                      <div className="text-xs text-slate-400">{invitedMember.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2 flex-wrap">
                    {invitedMember.clinic_role && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                        {CLINIC_ROLE_LABELS[invitedMember.clinic_role]}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      초대 발송됨
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onResendInvitation(invitedMember)}
                      title="재발송"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteInvitation(invitedMember.id, invitedMember.name)}
                      title="초대 삭제"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvitedMembersSection;
