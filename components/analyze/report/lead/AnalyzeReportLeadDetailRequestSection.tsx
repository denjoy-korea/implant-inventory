import React from 'react';
import AnalyzeReportLeadDetailedFields from './AnalyzeReportLeadDetailedFields';

interface AnalyzeReportLeadDetailRequestSectionProps {
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  updateWantDetailedAnalysis: (value: boolean) => void;
  updateLeadHospital: (value: string) => void;
  updateLeadRegion: (value: string) => void;
  updateLeadContact: (value: string) => void;
}

const AnalyzeReportLeadDetailRequestSection: React.FC<AnalyzeReportLeadDetailRequestSectionProps> = ({
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
  updateWantDetailedAnalysis,
  updateLeadHospital,
  updateLeadRegion,
  updateLeadContact,
}) => {
  return (
    <>
      <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={wantDetailedAnalysis}
          onChange={(e) => updateWantDetailedAnalysis(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
        />
        <div>
          <span className="text-sm font-bold text-slate-800">상세 분석 및 입력환경 최적화 요청</span>
          <p className="text-xs text-slate-400 mt-0.5">현장 방문을 통한 정밀 재고 분석과 맞춤 입력환경을 제안해드립니다.</p>
        </div>
      </label>

      {wantDetailedAnalysis && (
        <AnalyzeReportLeadDetailedFields
          leadHospital={leadHospital}
          leadRegion={leadRegion}
          leadContact={leadContact}
          updateLeadHospital={updateLeadHospital}
          updateLeadRegion={updateLeadRegion}
          updateLeadContact={updateLeadContact}
        />
      )}
    </>
  );
};

export default AnalyzeReportLeadDetailRequestSection;
