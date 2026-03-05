import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from 'react';
import type { AnalyzeUploadTarget } from './analyzeUploadFileHelpers';
import { processAnalyzeFixtureUpload } from './processAnalyzeFixtureUpload';
import { processAnalyzeSurgeryUpload } from './processAnalyzeSurgeryUpload';
import {
  preventAnalyzeDragDefaults,
  processAnalyzeDroppedFiles,
} from './processAnalyzeDroppedFiles';

interface UseAnalyzeUploadHandlersParams {
  clearAnalyzeError: () => void;
  setFixtureFile: Dispatch<SetStateAction<File | null>>;
  setSurgeryFiles: Dispatch<SetStateAction<File[]>>;
  setUploadFormatWarning: Dispatch<SetStateAction<string>>;
}

interface UseAnalyzeUploadHandlersResult {
  handleFixtureChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: DragEvent, type: AnalyzeUploadTarget) => void;
  handleDragOver: (e: DragEvent) => void;
}

export function useAnalyzeUploadHandlers({
  clearAnalyzeError,
  setFixtureFile,
  setSurgeryFiles,
  setUploadFormatWarning,
}: UseAnalyzeUploadHandlersParams): UseAnalyzeUploadHandlersResult {
  const handleFixtureChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAnalyzeFixtureUpload(file, {
      clearAnalyzeError,
      setFixtureFile,
      setUploadFormatWarning,
    });
  }, [clearAnalyzeError, setFixtureFile, setUploadFormatWarning]);

  const handleSurgeryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    processAnalyzeSurgeryUpload(Array.from(e.target.files || []), {
      clearAnalyzeError,
      setSurgeryFiles,
      setUploadFormatWarning,
    });
  }, [clearAnalyzeError, setSurgeryFiles, setUploadFormatWarning]);

  const removeSurgeryFile = useCallback((idx: number) => {
    setSurgeryFiles((prev) => prev.filter((_, i) => i !== idx));
  }, [setSurgeryFiles]);

  const handleDrop = useCallback((e: DragEvent, type: AnalyzeUploadTarget) => {
    preventAnalyzeDragDefaults(e);
    processAnalyzeDroppedFiles(Array.from(e.dataTransfer.files as FileList), type, {
      clearAnalyzeError,
      setFixtureFile,
      setSurgeryFiles,
      setUploadFormatWarning,
    });
  }, [clearAnalyzeError, setFixtureFile, setSurgeryFiles, setUploadFormatWarning]);

  const handleDragOver = useCallback((e: DragEvent) => {
    preventAnalyzeDragDefaults(e);
  }, []);

  return {
    handleFixtureChange,
    handleSurgeryChange,
    removeSurgeryFile,
    handleDrop,
    handleDragOver,
  };
}
