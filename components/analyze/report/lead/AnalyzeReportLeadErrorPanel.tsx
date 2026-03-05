import React from 'react';

interface AnalyzeReportLeadErrorPanelProps {
  leadSubmitError: string;
  leadSubmitDisabled: boolean;
  handleLeadSubmit: () => void;
  retryLabel: string;
}

const AnalyzeReportLeadErrorPanel: React.FC<AnalyzeReportLeadErrorPanelProps> = ({
  leadSubmitError,
  leadSubmitDisabled,
  handleLeadSubmit,
  retryLabel,
}) => {
  if (!leadSubmitError) return null;

  return (
    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 space-y-2">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span>{leadSubmitError}</span>
      </div>
      <button
        type="button"
        onClick={handleLeadSubmit}
        disabled={leadSubmitDisabled}
        className="w-full py-2 text-xs font-bold rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {retryLabel}
      </button>
    </div>
  );
};

export default AnalyzeReportLeadErrorPanel;
