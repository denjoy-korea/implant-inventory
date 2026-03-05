import type { Dispatch, SetStateAction } from 'react';
import { buildAnalyzeUploadFormatWarning } from './analyzeUploadFileHelpers';

type UploadWarningSetter = Dispatch<SetStateAction<string>>;

export function setAnalyzeUploadWarningFromInvalid(
  invalidFiles: File[],
  setUploadFormatWarning: UploadWarningSetter,
): void {
  if (invalidFiles.length === 0) return;
  setUploadFormatWarning(buildAnalyzeUploadFormatWarning(invalidFiles.map((file) => file.name)));
}

export function clearAnalyzeUploadWarningWhenValid(
  validFiles: File[],
  setUploadFormatWarning: UploadWarningSetter,
): void {
  if (validFiles.length > 0) {
    setUploadFormatWarning('');
  }
}
