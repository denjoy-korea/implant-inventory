
import React, { useRef } from 'react';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-4xl mx-auto my-8">
      <div 
        onClick={handleContainerClick}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
          ${isLoading ? 'bg-slate-100 border-slate-300 pointer-events-none' : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx"
          className="hidden" 
        />
        
        <div className="flex flex-col items-center">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4">
            {isLoading ? (
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-700">
            {isLoading ? 'Processing File...' : 'Upload Excel File'}
          </h2>
          <p className="mt-2 text-slate-500">Click to browse or drag and drop your .xlsx file here</p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700">
            Select File
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
