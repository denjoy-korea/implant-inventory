import React from 'react';

interface AnalyzeProcessingStepProps {
  progress: number;
  processingMsg: string;
}

const AnalyzeProcessingStep: React.FC<AnalyzeProcessingStepProps> = ({ progress, processingMsg }) => {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center px-6 text-white">
        <div className="relative w-48 h-48 mx-auto mb-10">
          {/* 배경 블러 효과 */}
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[60px] opacity-40 animate-pulse-glow"></div>

          <svg viewBox="0 0 140 140" className="relative w-full h-full -rotate-90 z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="70" cy="70" r="60" fill="none"
              stroke="url(#progressGradient)" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-black text-white z-20 drop-shadow-md">{Math.round(progress)}%</span>
          </div>
        </div>
        <h2 className="text-2xl font-black text-white mb-3">데이터를 분석하고 있습니다</h2>
        <p className="text-indigo-200 text-sm animate-pulse">{processingMsg}</p>
      </div>
    </div>
  );
};

export default AnalyzeProcessingStep;
