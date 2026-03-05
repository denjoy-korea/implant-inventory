import React from 'react';

interface AnalyzeReportLeadEmailSectionProps {
  leadEmail: string;
  updateLeadEmail: (value: string) => void;
}

const AnalyzeReportLeadEmailSection: React.FC<AnalyzeReportLeadEmailSectionProps> = ({
  leadEmail,
  updateLeadEmail,
}) => {
  return (
    <>
      <label htmlFor="analyze-lead-email" className="block text-xs font-bold text-slate-500 mb-1">
        이메일 주소 *
      </label>
      <input
        id="analyze-lead-email"
        type="email"
        value={leadEmail}
        onChange={(e) => updateLeadEmail(e.target.value)}
        placeholder="이메일 주소 *"
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-xs text-slate-500">입력하신 이메일은 결과 전달 및 후속 안내 목적으로만 사용합니다.</p>
    </>
  );
};

export default AnalyzeReportLeadEmailSection;
