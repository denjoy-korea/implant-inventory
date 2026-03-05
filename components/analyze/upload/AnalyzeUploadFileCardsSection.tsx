import React from 'react';

interface AnalyzeUploadFileCardsSectionProps {
  fixtureFile: File | null;
  setFixtureFile: React.Dispatch<React.SetStateAction<File | null>>;
  surgeryFiles: File[];
  fixtureDrop: React.RefObject<HTMLDivElement | null>;
  surgeryDrop: React.RefObject<HTMLDivElement | null>;
  handleFixtureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSurgeryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeSurgeryFile: (idx: number) => void;
  handleDrop: (e: React.DragEvent, type: 'fixture' | 'surgery') => void;
  handleDragOver: (e: React.DragEvent) => void;
}

const AnalyzeUploadFileCardsSection: React.FC<AnalyzeUploadFileCardsSectionProps> = ({
  fixtureFile,
  setFixtureFile,
  surgeryFiles,
  fixtureDrop,
  surgeryDrop,
  handleFixtureChange,
  handleSurgeryChange,
  removeSurgeryFile,
  handleDrop,
  handleDragOver,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Fixture Upload */}
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

      {/* Surgery Upload */}
      <div
        ref={surgeryDrop}
        onDrop={(e) => handleDrop(e, 'surgery')}
        onDragOver={handleDragOver}
        className={`group relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${surgeryFiles.length > 0 ? 'border-indigo-400 bg-indigo-50/50 shadow-indigo-100/50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-indigo-100/40'}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">수술기록지</h3>
        <p className="text-sm text-slate-400 mb-4">월별 수술기록 엑셀 (최대 6개)</p>
        {surgeryFiles.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {surgeryFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-center gap-2 text-sm">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-indigo-700 font-medium text-xs">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeSurgeryFile(i)}
                  aria-label={`업로드한 수술기록 파일 ${f.name} 삭제`}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {surgeryFiles.length < 6 && (
          <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            파일 추가
            <input type="file" accept=".xlsx,.xls" multiple onChange={handleSurgeryChange} className="hidden" />
          </label>
        )}
        <p className="text-xs text-slate-300 mt-3">.xlsx / .xls &middot; {surgeryFiles.length}/6 파일</p>
      </div>
    </div>
  );
};

export default AnalyzeUploadFileCardsSection;
