import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { AnalyzeUploadTarget } from './analyzeUploadFileHelpers';
import { useAnalyzeUploadHandlers } from './useAnalyzeUploadHandlers';

interface UseAnalyzeUploadFilesParams {
  clearAnalyzeError: () => void;
}

export interface UseAnalyzeUploadFilesResult {
  fixtureFile: File | null;
  setFixtureFile: Dispatch<SetStateAction<File | null>>;
  surgeryFiles: File[];
  uploadFormatWarning: string;
  fixtureDrop: RefObject<HTMLDivElement | null>;
  surgeryDrop: RefObject<HTMLDivElement | null>;
  handleFixtureChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: DragEvent, type: AnalyzeUploadTarget) => void;
  handleDragOver: (e: DragEvent) => void;
}

export function useAnalyzeUploadFiles({
  clearAnalyzeError,
}: UseAnalyzeUploadFilesParams): UseAnalyzeUploadFilesResult {
  const [fixtureFile, setFixtureFile] = useState<File | null>(null);
  const [surgeryFiles, setSurgeryFiles] = useState<File[]>([]);
  const [uploadFormatWarning, setUploadFormatWarning] = useState('');

  const fixtureDrop = useRef<HTMLDivElement>(null);
  const surgeryDrop = useRef<HTMLDivElement>(null);
  const {
    handleFixtureChange,
    handleSurgeryChange,
    removeSurgeryFile,
    handleDrop,
    handleDragOver,
  } = useAnalyzeUploadHandlers({
    clearAnalyzeError,
    setFixtureFile,
    setSurgeryFiles,
    setUploadFormatWarning,
  });

  return {
    fixtureFile,
    setFixtureFile,
    surgeryFiles,
    uploadFormatWarning,
    fixtureDrop,
    surgeryDrop,
    handleFixtureChange,
    handleSurgeryChange,
    removeSurgeryFile,
    handleDrop,
    handleDragOver,
  };
}
