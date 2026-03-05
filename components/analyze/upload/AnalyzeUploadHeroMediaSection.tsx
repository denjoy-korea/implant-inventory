import React from 'react';

interface AnalyzeUploadHeroMediaSectionProps {
  demoVideoUrl: string | null;
  isVideoLoading: boolean;
}

const AnalyzeUploadHeroMediaSection: React.FC<AnalyzeUploadHeroMediaSectionProps> = ({
  demoVideoUrl,
  isVideoLoading,
}) => {
  return (
    <>
      {/* Hero */}
      <div className="text-center mb-16 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-6 shadow-sm">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-glow"></span>
          <span className="text-sm font-bold text-emerald-700">무료 데이터 품질 진단</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
          우리 병원 임플란트 데이터,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-pulse-glow">
            얼마나 잘 관리되고 있을까요?
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
          픽스쳐 재고 파일과 수술기록지를 업로드하면,<br />
          데이터 품질을 6가지 항목으로 정밀히 진단해드립니다.
        </p>
      </div>

      {/* Demo Video -> Image Replacement */}
      <div className="mb-12">
        <p className="text-sm text-slate-400 mb-2 text-center tracking-wide">▶ DenJOY 재고관리 시스템 실제 운영 사례</p>
        <div className={`rounded-2xl overflow-hidden border border-slate-200 shadow-lg min-h-[400px] ${!demoVideoUrl && !isVideoLoading ? 'bg-slate-100 flex items-center justify-center p-2 sm:p-4' : 'bg-slate-50 relative'}`}>
          {isVideoLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : demoVideoUrl ? (
            <video
              src={demoVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src="/system-operation.png"
              alt="DenJOY 재고관리 시스템 실제 운영 사례"
              className="w-full h-auto rounded-xl shadow-sm border border-slate-200 object-contain max-h-[600px]"
            />
          )}
        </div>
      </div>
    </>
  );
};

export default AnalyzeUploadHeroMediaSection;
