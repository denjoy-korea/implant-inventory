import type { Dispatch, SetStateAction } from 'react';

export interface AnalyzeUploadHandlerMutators {
  clearAnalyzeError: () => void;
  setFixtureFile: Dispatch<SetStateAction<File | null>>;
  setSurgeryFiles: Dispatch<SetStateAction<File[]>>;
  setUploadFormatWarning: Dispatch<SetStateAction<string>>;
}
