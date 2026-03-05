import React from 'react';

interface AnalyzeUploadAlertsSectionProps {
  uploadFormatWarning: string;
  error: string | null;
}

const AnalyzeUploadAlertsSection: React.FC<AnalyzeUploadAlertsSectionProps> = ({ uploadFormatWarning, error }) => {
  return (
    <>
      {/* Upload format warning */}
      {uploadFormatWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center font-medium">
          {uploadFormatWarning}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 text-center font-medium">
          {error}
        </div>
      )}
    </>
  );
};

export default AnalyzeUploadAlertsSection;
