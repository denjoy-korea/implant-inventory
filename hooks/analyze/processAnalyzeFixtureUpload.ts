import { splitExcelFiles } from '../../components/analyze/analyzeInputUtils';
import { setAnalyzeUploadWarningFromInvalid } from './analyzeUploadWarningUtils';
import type { AnalyzeUploadHandlerMutators } from './analyzeUploadMutators';

export function processAnalyzeFixtureUpload(
  file: File,
  {
    clearAnalyzeError,
    setFixtureFile,
    setUploadFormatWarning,
  }: Pick<AnalyzeUploadHandlerMutators, 'clearAnalyzeError' | 'setFixtureFile' | 'setUploadFormatWarning'>,
): void {
  const { valid, invalid } = splitExcelFiles([file]);
  if (invalid.length > 0) {
    setAnalyzeUploadWarningFromInvalid(invalid, setUploadFormatWarning);
    return;
  }

  setFixtureFile(valid[0]);
  clearAnalyzeError();
  setUploadFormatWarning('');
}
