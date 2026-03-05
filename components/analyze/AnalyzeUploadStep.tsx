import React from 'react';
import PublicInfoFooter from '../shared/PublicInfoFooter';
import AnalyzeUploadHeroMediaSection from './upload/AnalyzeUploadHeroMediaSection';
import AnalyzeUploadFileCardsSection from './upload/AnalyzeUploadFileCardsSection';
import AnalyzeUploadChecklistSection from './upload/AnalyzeUploadChecklistSection';
import AnalyzeUploadTrustSection from './upload/AnalyzeUploadTrustSection';
import AnalyzeUploadAlertsSection from './upload/AnalyzeUploadAlertsSection';
import AnalyzeUploadActionSection from './upload/AnalyzeUploadActionSection';
import type { UploadRequirement } from './upload/uploadTypes';

export interface AnalyzeUploadStepProps {
  fixtureFile: File | null;
  setFixtureFile: React.Dispatch<React.SetStateAction<File | null>>;
  surgeryFiles: File[];
  demoVideoUrl: string | null;
  isVideoLoading: boolean;
  uploadFormatWarning: string;
  error: string | null;
  fixtureDrop: React.RefObject<HTMLDivElement | null>;
  surgeryDrop: React.RefObject<HTMLDivElement | null>;
  uploadRequirements: UploadRequirement[];
  analyzeDisabledReasons: string[];
  isAnalyzeDisabled: boolean;
  handleFixtureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: React.DragEvent, type: 'fixture' | 'surgery') => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleAnalyze: () => void;
}

const AnalyzeUploadStep: React.FC<AnalyzeUploadStepProps> = ({
  fixtureFile,
  setFixtureFile,
  surgeryFiles,
  demoVideoUrl,
  isVideoLoading,
  uploadFormatWarning,
  error,
  fixtureDrop,
  surgeryDrop,
  uploadRequirements,
  analyzeDisabledReasons,
  isAnalyzeDisabled,
  handleFixtureChange,
  handleSurgeryChange,
  removeSurgeryFile,
  handleDrop,
  handleDragOver,
  handleAnalyze,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <AnalyzeUploadHeroMediaSection demoVideoUrl={demoVideoUrl} isVideoLoading={isVideoLoading} />
        <AnalyzeUploadFileCardsSection
          fixtureFile={fixtureFile}
          setFixtureFile={setFixtureFile}
          surgeryFiles={surgeryFiles}
          fixtureDrop={fixtureDrop}
          surgeryDrop={surgeryDrop}
          handleFixtureChange={handleFixtureChange}
          handleSurgeryChange={handleSurgeryChange}
          removeSurgeryFile={removeSurgeryFile}
          handleDrop={handleDrop}
          handleDragOver={handleDragOver}
        />
        <AnalyzeUploadChecklistSection uploadRequirements={uploadRequirements} />
        <AnalyzeUploadTrustSection />
        <AnalyzeUploadAlertsSection uploadFormatWarning={uploadFormatWarning} error={error} />
        <AnalyzeUploadActionSection
          isAnalyzeDisabled={isAnalyzeDisabled}
          analyzeDisabledReasons={analyzeDisabledReasons}
          handleAnalyze={handleAnalyze}
        />
      </div>

      <PublicInfoFooter showLegalLinks />
    </div>
  );
};

export default AnalyzeUploadStep;
