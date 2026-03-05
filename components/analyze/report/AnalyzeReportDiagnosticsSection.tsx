import React from 'react';
import type { AnalysisReport } from '../../../types';
import AnalyzeDiagnosticCard from './diagnostics/AnalyzeDiagnosticCard';
import AnalyzeSizeFormatDetailModal from './diagnostics/AnalyzeSizeFormatDetailModal';

interface AnalyzeReportDiagnosticsSectionProps {
  diagnostics: AnalysisReport['diagnostics'];
  sizeFormatDetailItems: string[] | null;
  setSizeFormatDetailItems: React.Dispatch<React.SetStateAction<string[] | null>>;
}

const AnalyzeReportDiagnosticsSection: React.FC<AnalyzeReportDiagnosticsSectionProps> = ({
  diagnostics,
  sizeFormatDetailItems,
  setSizeFormatDetailItems,
}) => {
  return (
    <>
      {/* Section 2: Diagnostic Results */}
      <section className="py-16 bg-slate-50 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">상세 진단 결과</h2>
            <p className="text-slate-500 font-medium">6가지 핵심 지표를 바탕으로 데이터 품질을 평가했습니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {diagnostics.map((diagnostic, index) => (
              <AnalyzeDiagnosticCard
                key={index}
                diagnostic={diagnostic}
                onOpenSizeFormatDetail={(items) => setSizeFormatDetailItems(items)}
              />
            ))}
          </div>
        </div>
      </section>

      {sizeFormatDetailItems && (
        <AnalyzeSizeFormatDetailModal
          items={sizeFormatDetailItems}
          onClose={() => setSizeFormatDetailItems(null)}
        />
      )}
    </>
  );
};

export default AnalyzeReportDiagnosticsSection;
