import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BUSINESS_INFO } from '../../utils/businessInfo';
import {
  EFFECTIVE_DATE,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  ParagraphEntry,
} from './LegalModal';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const sections = type === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const title = type === 'terms' ? '이용약관' : '개인정보처리방침';
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver로 활성 섹션 추적
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
            break;
          }
        }
      },
      { root: container, rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    container.querySelectorAll('section[id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = scrollContainerRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderEntry = (entry: ParagraphEntry, idx: number) => {
    if (typeof entry === 'string') {
      return (
        <li key={idx} className="flex gap-4 p-0">
          <span className="shrink-0 w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 mt-1">
            {idx + 1}
          </span>
          <span className="text-[15px] pt-1 text-slate-600 block flex-1">{entry}</span>
        </li>
      );
    }
    if ('type' in entry && entry.type === 'table') {
      return (
        <li key={idx} className="p-0">
          <div className="overflow-x-auto my-6 rounded-xl border border-slate-200">
            <table className="w-full text-left text-[14px] border-collapse bg-white">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {entry.headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entry.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-slate-600">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </li>
      );
    }
    if ('text' in entry) {
      return (
        <li key={idx} className="p-0">
          <div className="my-2 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-5 shadow-sm">
            <div className="flex gap-4">
              <div className="shrink-0 bg-white p-1.5 rounded-lg shadow-sm w-9 h-9 flex items-center justify-center border border-indigo-50">
                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="m-0 font-medium text-[15px] leading-[1.7] text-indigo-900/90 tracking-tight">{entry.text}</p>
            </div>
          </div>
        </li>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>{title} | DenJOY</title>
        <meta name="description" content={`DenJOY ${title} — 시행일 ${EFFECTIVE_DATE}`} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* 뒤로 */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          홈으로
        </button>

        <div className="flex gap-10 items-start">
          {/* 본문 */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-w-0"
          >
            {/* 헤더 */}
            <div className="pb-8 mb-10 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  법적 문서
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">{title}</h1>
              <p className="text-sm text-slate-500">시행일: {EFFECTIVE_DATE}</p>
            </div>

            {/* 섹션 목록 */}
            <div className="prose prose-slate max-w-none text-slate-600 leading-[1.8] space-y-12">
              {sections.map((section, sectionIdx) => {
                const sectionId = `section-${sectionIdx}`;
                return (
                  <section key={section.title} id={sectionId} className="scroll-mt-6 group">
                    <h3 className="text-lg font-black text-slate-800 mt-0 mb-5 pb-3 border-b border-slate-100 group-hover:border-slate-200 transition-colors">
                      {section.title}
                    </h3>
                    {section.paragraphs.length === 1 ? (
                      (() => {
                        const e = section.paragraphs[0];
                        if (typeof e === 'string') return <p className="text-[15px]">{e}</p>;
                        if ('type' in e && e.type === 'table') {
                          return (
                            <div className="overflow-x-auto my-6 rounded-xl border border-slate-200">
                              <table className="w-full text-left text-[14px] border-collapse bg-white">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                    {e.headers.map((h, i) => (
                                      <th key={i} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {e.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                      {row.map((cell, j) => (
                                        <td key={j} className="px-4 py-3 text-slate-600">{cell}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        if ('text' in e) {
                          return (
                            <div className="my-6 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-5 shadow-sm">
                              <div className="flex gap-4">
                                <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-lg shadow-sm w-9 h-9 flex items-center justify-center border border-indigo-50">
                                  <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <p className="m-0 font-medium text-[15px] leading-[1.7] text-indigo-900/90">{e.text}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()
                    ) : (
                      <ul className="space-y-4 list-none p-0 m-0">
                        {section.paragraphs.map((entry, idx) => renderEntry(entry, idx))}
                      </ul>
                    )}
                  </section>
                );
              })}

              {/* 사업자 정보 */}
              <section className="mt-16 pt-8 border-t border-slate-200">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/denjoy_logo.png" alt="DenJOY Logo" className="w-8 h-auto object-contain opacity-90" />
                  </div>
                  <div className="space-y-3 flex-1 text-sm text-slate-500">
                    <h3 className="text-base font-black text-slate-800 mt-0 mb-1">사업자 정보</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                      <p><span className="font-semibold text-slate-700 w-24 inline-block">상호</span> {BUSINESS_INFO.companyDisplayName}</p>
                      <p><span className="font-semibold text-slate-700 w-24 inline-block">대표</span> {BUSINESS_INFO.representativeName}</p>
                      <p><span className="font-semibold text-slate-700 w-24 inline-block">사업자번호</span> {BUSINESS_INFO.businessRegistrationNumber}</p>
                      <p><span className="font-semibold text-slate-700 w-24 inline-block">통신판매업</span> {BUSINESS_INFO.ecommerceReportNumber}</p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-200/60 inline-flex items-center gap-2">
                      <span className="font-semibold text-slate-700">고객지원</span>
                      <a href={`mailto:${BUSINESS_INFO.supportEmail}`} className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium transition-all">{BUSINESS_INFO.supportEmail}</a>
                      <span className="text-xs text-slate-400 ml-1">(평일 10:00~17:00)</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* 우측 ToC — 데스크톱 전용 */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              목차
            </h4>
            <nav className="space-y-1 relative">
              <div
                className="absolute left-0 w-full min-h-[36px] bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ease-out z-0"
                style={{
                  top: `${Math.max(0, sections.findIndex((_, i) => `section-${i}` === activeSectionId)) * 40}px`,
                  opacity: activeSectionId ? 1 : 0,
                }}
              />
              {sections.map((section, idx) => {
                const id = `section-${idx}`;
                const isActive = activeSectionId === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`relative z-10 w-full text-left px-4 py-2 text-sm rounded-xl transition-all duration-200 flex items-center gap-3 group h-[36px] mt-1 first:mt-0 ${
                      isActive
                        ? 'font-bold text-indigo-700'
                        : 'font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-500 scale-100' : 'bg-slate-300 scale-0 group-hover:scale-100'}`} />
                    <span className="truncate flex-1">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      </div>
    </>
  );
};

export default LegalPage;
