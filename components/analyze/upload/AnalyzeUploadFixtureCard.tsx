import React from 'react';

interface AnalyzeUploadFixtureCardProps {
  fixtureFile: File | null;
  setFixtureFile: React.Dispatch<React.SetStateAction<File | null>>;
  fixtureDrop: React.RefObject<HTMLDivElement | null>;
  handleFixtureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent, type: 'fixture' | 'surgery') => void;
  handleDragOver: (e: React.DragEvent) => void;
}

const AnalyzeUploadFixtureCard: React.FC<AnalyzeUploadFixtureCardProps> = ({
  fixtureFile,
  setFixtureFile,
  fixtureDrop,
  handleFixtureChange,
  handleDrop,
  handleDragOver,
}) => {
  return (
    <div
      ref={fixtureDrop}
      onDrop={(e) => handleDrop(e, 'fixture')}
      onDragOver={handleDragOver}
      className={`group relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${fixtureFile ? 'border-emerald-400 bg-emerald-50/50 shadow-emerald-100/50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-emerald-100/40'}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">재고 목록 (픽스쳐)</h3>
      <p className="text-sm text-slate-400 mb-4">덴트웹에서 다운로드한 픽스쳐 엑셀 파일</p>
      {fixtureFile ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-700 font-semibold">{fixtureFile.name}</span>
          <button
            type="button"
            onClick={() => setFixtureFile(null)}
            aria-label="업로드한 재고 목록 파일 삭제"
            className="text-slate-400 hover:text-rose-500 ml-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : (
        <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          파일 선택
          <input type="file" accept=".xlsx,.xls" onChange={handleFixtureChange} className="hidden" />
        </label>
      )}
      <p className="text-xs text-slate-300 mt-3">.xlsx / .xls</p>
    </div>
  );
};

export default AnalyzeUploadFixtureCard;
