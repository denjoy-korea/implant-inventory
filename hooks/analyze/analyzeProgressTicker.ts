import type { Dispatch, SetStateAction } from 'react';

interface AnalyzeProgressTickerParams {
  setProgress: Dispatch<SetStateAction<number>>;
  setProcessingMsg: Dispatch<SetStateAction<string>>;
  processingMessages: readonly string[];
  intervalMs?: number;
}

export function startAnalyzeProgressTicker({
  setProgress,
  setProcessingMsg,
  processingMessages,
  intervalMs = 400,
}: AnalyzeProgressTickerParams): ReturnType<typeof setInterval> {
  let msgIdx = 0;

  return setInterval(() => {
    setProgress((prev) => {
      const next = Math.min(prev + Math.random() * 8 + 2, 90);
      const newMsgIdx = Math.min(
        Math.floor((next / 100) * processingMessages.length),
        processingMessages.length - 1,
      );
      if (newMsgIdx !== msgIdx) {
        msgIdx = newMsgIdx;
        setProcessingMsg(processingMessages[msgIdx]);
      }
      return next;
    });
  }, intervalMs);
}
