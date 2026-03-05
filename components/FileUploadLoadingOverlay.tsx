import React from 'react';
import { UploadType } from '../types';

const SURGERY_UPLOAD_STEPS = [
  '파일을 읽는 중...',
  '수술기록 분석 중...',
  '재고 마스터와 비교 중...',
  '데이터 등록 중...',
];
const FIXTURE_UPLOAD_STEPS = [
  '파일을 읽는 중...',
  '재료 목록 파싱 중...',
  '데이터 처리 중...',
  '잠시만 기다려 주세요...',
];

export function FileUploadLoadingOverlay({ type }: { type: UploadType | null }) {
  const steps = type === 'surgery' ? SURGERY_UPLOAD_STEPS : FIXTURE_UPLOAD_STEPS;
  const [stepIndex, setStepIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStepIndex(i => (i + 1) % steps.length);
        setVisible(true);
      }, 300);
    }, 700);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-[340] bg-white/70 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 bg-white rounded-3xl shadow-2xl border border-slate-100 px-12 py-9">
        <div className="w-11 h-11 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p
          className={`text-sm text-slate-600 font-medium text-center min-w-[9rem] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[5px]'}`}
        >
          {steps[stepIndex]}
        </p>
      </div>
    </div>
  );
}
