import React from 'react';
import { ANALYZE_UPLOAD_TRUST_ITEMS } from './uploadContent';

const AnalyzeUploadTrustSection: React.FC = () => {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
      {ANALYZE_UPLOAD_TRUST_ITEMS.map((item) => (
        <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800 mb-1">{item.title}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
        </div>
      ))}
    </div>
  );
};

export default AnalyzeUploadTrustSection;
