import { splitExcelFiles } from '../../components/analyze/analyzeInputUtils';
import {
  mergeAnalyzeSurgeryFiles,
  type AnalyzeUploadTarget,
} from './analyzeUploadFileHelpers';
import {
  clearAnalyzeUploadWarningWhenValid,
  setAnalyzeUploadWarningFromInvalid,
} from './analyzeUploadWarningUtils';
import type { AnalyzeUploadHandlerMutators } from './analyzeUploadMutators';

export function processAnalyzeDroppedFiles(
  files: File[],
  target: AnalyzeUploadTarget,
  {
    clearAnalyzeError,
    setFixtureFile,
    setSurgeryFiles,
    setUploadFormatWarning,
  }: AnalyzeUploadHandlerMutators,
): void {
  const { valid, invalid } = splitExcelFiles(files);

  if (target === 'fixture' && valid[0]) {
    setFixtureFile(valid[0]);
    clearAnalyzeError();
  } else if (target === 'surgery' && valid.length > 0) {
    setSurgeryFiles((previousFiles) => mergeAnalyzeSurgeryFiles(previousFiles, valid));
    clearAnalyzeError();
  }

  if (invalid.length > 0) {
    setAnalyzeUploadWarningFromInvalid(invalid, setUploadFormatWarning);
    return;
  }

  clearAnalyzeUploadWarningWhenValid(valid, setUploadFormatWarning);
}

export function preventAnalyzeDragDefaults(
  e: { preventDefault: () => void; stopPropagation: () => void },
): void {
  e.preventDefault();
  e.stopPropagation();
}
