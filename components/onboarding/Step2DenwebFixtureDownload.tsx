interface Props {
  onNext: () => void;
}

const STEPS = [
  { step: '1', label: '덴트웹 환경설정 접속' },
  { step: '2', label: '진료 관련 덴트웹 설정 메뉴 클릭' },
  { step: '3', label: '임플란트 픽스쳐 설정 클릭 — 팝업이 열립니다' },
  { step: '4', label: '팝업 하단 왼쪽 파일로 저장 클릭' },
];

export default function Step2DenwebFixtureDownload({ onNext }: Props) {
  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <h2 className="text-xl font-black text-slate-900 mb-1">픽스처 목록 다운로드</h2>
      <p className="text-sm text-slate-500 mb-5">
        덴트웹에서 기존에 설정된 픽스처 목록을 파일로 저장하세요.<br />
        다음 단계에서 이 파일을 덴조이에 업로드합니다.
      </p>

      <div className="space-y-2 mb-4 flex-1">
        {STEPS.map(({ step, label }) => (
          <div key={step} className="flex items-center gap-4 bg-slate-50 rounded-2xl px-5 py-3.5">
            <span className="text-xs font-black text-indigo-500 w-5 shrink-0">{step}</span>
            <p className="text-sm text-slate-700 flex-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            파일을 아직 다운로드하지 않았다면 덴트웹에 접속 후 저장한 뒤 완료를 눌러주세요.
          </p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        파일 저장 완료
      </button>
    </div>
  );
}
