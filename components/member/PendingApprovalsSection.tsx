import React from 'react';

interface PendingMember {
  _id: string;
  email: string;
  name: string;
}

interface PendingApprovalsSectionProps {
  pendingMembers: PendingMember[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

const PendingApprovalsSection: React.FC<PendingApprovalsSectionProps> = ({
  pendingMembers,
  onApprove,
  onReject,
}) => {
  if (pendingMembers.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        가입 승인 대기 <span className="text-amber-600">{pendingMembers.length}</span>
      </h3>
      <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-amber-100/50">
            {pendingMembers.map((member) => (
              <tr key={member.email} className="hover:bg-amber-100/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{member.name}</div>
                  <div className="text-xs text-slate-500">{member.email}</div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onApprove(member._id)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => onReject(member._id)}
                    className="px-4 py-2 bg-white text-slate-600 border border-slate-200 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    거절
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingApprovalsSection;
