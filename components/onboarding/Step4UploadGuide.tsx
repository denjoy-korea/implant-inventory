import React from 'react';

interface Props {
  onGoToSurgeryUpload: () => void;
}

export default function Step4UploadGuide({ onGoToSurgeryUpload }: Props) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">수술기록 업로드</h2>
      <p className="text-sm text-slate-500 mb-5">
        덴트웹에서 다운로드한 .xlsx 파일을 그대로 업로드하면 됩니다
      </p>

      <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4 mb-4">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-black text-indigo-500 mb-0.5">업로드 방법</div>
          <div className="text-sm font-bold text-slate-800">수술기록 업로드 탭 → 파일 선택</div>
          <div className="text-xs text-slate-500">다운로드한 엑셀 파일을 선택하면 자동으로 파싱됩니다</div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-indigo-800">엑셀 샘플 파일</p>
            <p className="text-xs text-indigo-600 mt-0.5">어떤 형식인지 미리 확인하세요</p>
          </div>
          <a
            href="/surgery_sample.xlsx"
            download="덴조이_수술기록_샘플.xlsx"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            onClick={e => {
              fetch('/surgery_sample.xlsx', { method: 'HEAD' }).then(r => {
                if (!r.ok) {
                  e.preventDefault();
                  alert('샘플 파일 준비 중입니다. 덴트웹에서 직접 내보내기 해주세요.');
                }
              });
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            샘플 다운로드
          </a>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            업로드는 지금 당장 안 해도 됩니다. 재고 입력만으로도 대시보드에서 부족 품목을 바로 확인할 수 있어요.
          </p>
        </div>
      </div>

      <button
        onClick={onGoToSurgeryUpload}
        className="w-full py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        수술기록 업로드하기
      </button>
    </div>
  );
}
