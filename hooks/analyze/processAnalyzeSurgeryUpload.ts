import { splitExcelFiles } from '../../components/analyze/analyzeInputUtils';
import { mergeAnalyzeSurgeryFiles } from './analyzeUploadFileHelpers';
import {
  clearAnalyzeUploadWarningWhenValid,
  setAnalyzeUploadWarningFromInvalid,
} from './analyzeUploadWarningUtils';
import type { AnalyzeUploadHandlerMutators } from './analyzeUploadMutators';

export function processAnalyzeSurgeryUpload(
  files: File[],
  {
    clearAnalyzeError,
    setSurgeryFiles,
    setUploadFormatWarning,
  }: Pick<AnalyzeUploadHandlerMutators, 'clearAnalyzeError' | 'setSurgeryFiles' | 'setUploadFormatWarning'>,
): void {
  const { valid, invalid } = splitExcelFiles(files);

  if (valid.length > 0) {
    setSurgeryFiles((previousFiles) => mergeAnalyzeSurgeryFiles(previousFiles, valid));
    clearAnalyzeError();
  }

  if (invalid.length > 0) {
    setAnalyzeUploadWarningFromInvalid(invalid, setUploadFormatWarning);
    return;
  }

  clearAnalyzeUploadWarningWhenValid(valid, setUploadFormatWarning);
}
