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
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Top Section: Brand & Grid Links */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

            {/* Brand / Logo Area */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  {BUSINESS_INFO.companyDisplayName}
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                치과 맞춤형 프리미엄 임플란트 재고관리 솔루션.<br />
                가장 스마트하고 효율적인 병원 운영을 경험하세요.
              </p>
            </div>

            {/* Corporate Info Area */}
            <div className="md:col-span-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wider">Company</h3>
              <ul className="text-sm space-y-2 text-slate-500">
                <li>대표: {BUSINESS_INFO.representativeName}</li>
                <li>사업자등록번호: {BUSINESS_INFO.businessRegistrationNumber}</li>
                <li>통신판매업: {BUSINESS_INFO.ecommerceReportNumber}</li>
              </ul>
            </div>

            {/* Contact / Service Area */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wider">Contact Us</h3>
              <ul className="text-sm space-y-2 text-slate-500">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {BUSINESS_INFO.supportEmail}
                </li>
                <li className="flex items-center gap-2 leading-tight mt-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  평일 09:00 - 18:00<br />(점심 12:30 - 13:30)
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-slate-800/60 mb-8"></div>

          {/* Bottom Section: Copyright & Legal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} DenJOY. All rights reserved.</p>

            {showLegalLinks && (
              <div className="flex gap-6">
                <button onClick={() => setShowTerms(true)} className="hover:text-slate-300 transition-colors">
                  이용약관
                </button>
                <button onClick={() => setShowPrivacy(true)} className="hover:text-slate-300 transition-colors">
                  개인정보처리방침
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
      {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
    </>
  );
};

export default PublicInfoFooter;
