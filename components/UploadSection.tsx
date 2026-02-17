
import React, { useRef, useState } from 'react';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div ref={topRef} className="flex flex-col items-center justify-center min-h-[55vh] text-center animate-fade-in-up">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx"
        className="hidden"
      />

      {/* Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
        isLoading
          ? 'bg-indigo-100 border-2 border-indigo-200'
          : isDragging
            ? 'bg-indigo-100 border-2 border-indigo-300 scale-110'
            : 'bg-slate-50 border border-slate-100 shadow-sm'
      }`}>
        {isLoading ? (
          <svg className="animate-spin w-9 h-9 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className={`w-9 h-9 transition-colors duration-300 ${isDragging ? 'text-indigo-500' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )}
      </div>

      {/* Title & Description */}
      <div className="space-y-2 mb-8">
        <h3 className="text-xl font-bold text-slate-800">
          {isLoading ? '파일 처리 중...' : '엑셀 파일을 업로드해 주세요'}
        </h3>
        <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
          덴트웹에서 다운로드한 <span className="font-semibold text-slate-600">.xlsx 파일</span>을 선택하거나<br />
          아래 영역에 끌어다 놓으세요.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-300 ${
          isLoading
            ? 'bg-slate-50 border-slate-200 pointer-events-none'
            : isDragging
              ? 'bg-indigo-50 border-indigo-400 scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`p-3 rounded-xl transition-colors duration-300 ${
            isDragging ? 'bg-indigo-100' : 'bg-slate-100'
          }`}>
            <svg className={`w-6 h-6 transition-colors duration-300 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">
              {isDragging ? '여기에 놓으세요!' : '파일 선택 또는 드래그 앤 드롭'}
            </p>
            <p className="text-xs text-slate-400 mt-1">.xlsx 형식만 지원됩니다</p>
          </div>
          <button
            type="button"
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            파일 선택
          </button>
        </div>
      </div>

    </div>
  );
};

export default UploadSection;
