import React from 'react';

interface AnalyzeReportLeadDetailedFieldsProps {
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  updateLeadHospital: (value: string) => void;
  updateLeadRegion: (value: string) => void;
  updateLeadContact: (value: string) => void;
}

const AnalyzeReportLeadDetailedFields: React.FC<AnalyzeReportLeadDetailedFieldsProps> = ({
  leadHospital,
  leadRegion,
  leadContact,
  updateLeadHospital,
  updateLeadRegion,
  updateLeadContact,
}) => {
  return (
    <div className="space-y-3 pt-1">
      {/* 진행 체크리스트 */}
      <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg">
        {[
          { label: '병원명', filled: !!leadHospital },
          { label: '지역', filled: !!leadRegion },
          { label: '연락처', filled: !!leadContact },
        ].map((item) => (
          <div key={item.label} className={`flex items-center gap-1 text-xs font-bold ${item.filled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {item.filled ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            {item.label}
          </div>
        ))}
      </div>

      <label htmlFor="analyze-lead-hospital" className="block text-xs font-bold text-slate-500 mb-1">
        병원명 *
      </label>
      <input
        id="analyze-lead-hospital"
        type="text"
        value={leadHospital}
        onChange={(e) => updateLeadHospital(e.target.value)}
        placeholder="병원명 *"
        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${leadHospital ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
      />

      <label htmlFor="analyze-lead-region" className="block text-xs font-bold text-slate-500 mb-1">
        지역 *
      </label>
      <input
        id="analyze-lead-region"
        type="text"
        value={leadRegion}
        onChange={(e) => updateLeadRegion(e.target.value)}
        placeholder="지역 (예: 서울 강남구) *"
        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${leadRegion ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
      />

      <label htmlFor="analyze-lead-contact" className="block text-xs font-bold text-slate-500 mb-1">
        연락처 *
      </label>
      <input
        id="analyze-lead-contact"
        type="tel"
        value={leadContact}
        onChange={(e) => updateLeadContact(e.target.value)}
        placeholder="연락처 *"
        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${leadContact ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
      />

      <p className="text-xs text-slate-500">연락처는 분석 결과 브리핑 일정 조율 용도로만 사용합니다.</p>

      {(!leadHospital || !leadRegion || !leadContact) && (
        <p className="text-xs text-amber-600 text-center">
          {[!leadHospital && '병원명', !leadRegion && '지역', !leadContact && '연락처'].filter(Boolean).join(', ')}을(를) 입력하면 요청할 수 있어요
        </p>
      )}
    </div>
  );
};

export default AnalyzeReportLeadDetailedFields;
