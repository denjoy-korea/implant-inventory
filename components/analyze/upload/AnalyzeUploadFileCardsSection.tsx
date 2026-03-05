import React from 'react';
import AnalyzeUploadFixtureCard from './AnalyzeUploadFixtureCard';
import AnalyzeUploadSurgeryCard from './AnalyzeUploadSurgeryCard';

interface AnalyzeUploadFileCardsSectionProps {
  fixtureFile: File | null;
  setFixtureFile: React.Dispatch<React.SetStateAction<File | null>>;
  surgeryFiles: File[];
  fixtureDrop: React.RefObject<HTMLDivElement | null>;
  surgeryDrop: React.RefObject<HTMLDivElement | null>;
  handleFixtureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: React.DragEvent, type: 'fixture' | 'surgery') => void;
  handleDragOver: (e: React.DragEvent) => void;
}

const AnalyzeUploadFileCardsSection: React.FC<AnalyzeUploadFileCardsSectionProps> = ({
  fixtureFile,
  setFixtureFile,
  surgeryFiles,
  fixtureDrop,
  surgeryDrop,
  handleFixtureChange,
  handleSurgeryChange,
  removeSurgeryFile,
  handleDrop,
  handleDragOver,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <AnalyzeUploadFixtureCard
        fixtureFile={fixtureFile}
        setFixtureFile={setFixtureFile}
        fixtureDrop={fixtureDrop}
        handleFixtureChange={handleFixtureChange}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
      />
      <AnalyzeUploadSurgeryCard
        surgeryFiles={surgeryFiles}
        surgeryDrop={surgeryDrop}
        handleSurgeryChange={handleSurgeryChange}
        removeSurgeryFile={removeSurgeryFile}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
      />
    </div>
  );
};

export default AnalyzeUploadFileCardsSection;
