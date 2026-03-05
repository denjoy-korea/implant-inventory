import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  RefObject,
  SetStateAction,
} from 'react';
import type { AnalysisReport } from '../../types';
import type { AnalyzeStep } from '../../components/analyze/useAnalyzeStateMachine';
import type { UploadRequirement } from '../../components/analyze/upload/uploadTypes';
import type { AnalyzeTrialCopy } from './analyzePageSharedTypes';

export interface UseAnalyzePageResult {
  fixtureFile: File | null;
  setFixtureFile: Dispatch<SetStateAction<File | null>>;
  surgeryFiles: File[];
  sizeFormatDetailItems: string[] | null;
  setSizeFormatDetailItems: Dispatch<SetStateAction<string[] | null>>;
  demoVideoUrl: string | null;
  isVideoLoading: boolean;
  uploadFormatWarning: string;
  reportRef: RefObject<HTMLDivElement | null>;
  fixtureDrop: RefObject<HTMLDivElement | null>;
  surgeryDrop: RefObject<HTMLDivElement | null>;
  step: AnalyzeStep;
  report: AnalysisReport | null;
  progress: number;
  processingMsg: string;
  error: string;
  emailSent: boolean;
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  isSubmittingLead: boolean;
  leadSubmitError: string;
  setEmailSent: Dispatch<SetStateAction<boolean>>;
  updateLeadEmail: (value: string) => void;
  updateWantDetailedAnalysis: (value: boolean) => void;
  updateLeadHospital: (value: string) => void;
  updateLeadRegion: (value: string) => void;
  updateLeadContact: (value: string) => void;
  handleFixtureChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: DragEvent, type: 'fixture' | 'surgery') => void;
  handleDragOver: (e: DragEvent) => void;
  handleAnalyze: () => Promise<void>;
  handleLeadSubmit: () => Promise<void>;
  handleGoToConsultation: () => void;
  hasAnyUploadedFile: boolean;
  uploadRequirements: UploadRequirement[];
  analyzeDisabledReasons: string[];
  isAnalyzeDisabled: boolean;
  trialCopy: AnalyzeTrialCopy;
  analyzeTrialFootnoteText: string;
}
