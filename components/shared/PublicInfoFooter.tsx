import React, { useState } from 'react';
import LegalModal from './LegalModal';
import { BUSINESS_INFO } from '../../utils/businessInfo';

interface PublicInfoFooterProps {
  showLegalLinks?: boolean;
}

const PublicInfoFooter: React.FC<PublicInfoFooterProps> = ({ showLegalLinks = true }) => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-10">
        <div className="max-w-6xl mx-auto text-xs text-slate-400 leading-relaxed">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:min-h-[128px]">
            <div className="space-y-2">
              <p className="font-semibold text-slate-500">{BUSINESS_INFO.companyDisplayName}</p>
              <p>대표: {BUSINESS_INFO.representativeName} | 사업자등록번호: {BUSINESS_INFO.businessRegistrationNumber}</p>
              <p>통신판매업 신고번호: {BUSINESS_INFO.ecommerceReportNumber}</p>
              <p>이메일: {BUSINESS_INFO.supportEmail}</p>
            </div>
            <div className="md:text-right flex flex-col gap-2.5 md:items-end">
              <p className="text-slate-300">&copy; {new Date().getFullYear()} DenJOY. All rights reserved.</p>
              {showLegalLinks && (
                <div className="flex md:justify-end gap-6 pt-1">
                  <button onClick={() => setShowTerms(true)} className="relative text-xs text-slate-400 hover:text-slate-600 transition-colors group">
                    이용약관
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-400 transition-all duration-300 group-hover:w-full"></span>
                  </button>
                  <button onClick={() => setShowPrivacy(true)} className="relative text-xs text-slate-400 hover:text-slate-600 transition-colors group">
                    개인정보처리방침
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-400 transition-all duration-300 group-hover:w-full"></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>

      {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
      {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
    </>
  );
};

export default PublicInfoFooter;
