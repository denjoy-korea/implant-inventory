
import React, { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { contactService } from '../services/contactService';
import { pageViewService } from '../services/pageViewService';
import LegalModal from './shared/LegalModal';
import PublicInfoFooter from './shared/PublicInfoFooter';
import { BUSINESS_INFO } from '../utils/businessInfo';

interface ContactPageProps {
  onGetStarted: () => void;
  onAnalyze?: () => void;
}

const EMPTY_FORM = { hospitalName: '', contactName: '', email: '', role: '', phone: '', weeklySurgeries: '', inquiryType: '', content: '', agree: false };
type SubmittedForm = typeof EMPTY_FORM & { requestId: string | null };

const ContactPage: React.FC<ContactPageProps> = ({ onGetStarted, onAnalyze }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { toast, showToast } = useToast();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedForm | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }
    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const validateEmail = (email: string) => {
    // local@domain.tld 형식 검증 (naver.com, kakao.com, gmail.com 등)
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(form.email)) { showToast('이메일 형식이 올바르지 않습니다. (예: name@naver.com)', 'error'); return; }
    if (!form.agree) { showToast('개인정보 수집 및 이용에 동의해 주세요.', 'error'); return; }
    setSubmitting(true);
    try {
      pageViewService.trackEvent('contact_submit_start', { inquiry_type: form.inquiryType || null }, 'contact');
      const result = await contactService.submit({
        hospital_name: form.hospitalName,
        contact_name: form.contactName,
        email: form.email,
        role: form.role,
        phone: form.phone,
        weekly_surgeries: form.weeklySurgeries,
        inquiry_type: form.inquiryType,
        content: form.content,
      });
      pageViewService.trackEvent('contact_submit', { inquiry_type: form.inquiryType || null }, 'contact');
      setSubmitted({ ...form, requestId: result.requestId });
      setForm(EMPTY_FORM);
    } catch (error) {
      pageViewService.trackEvent('contact_submit_error', { inquiry_type: form.inquiryType || null }, 'contact');
      const message =
        error instanceof Error && error.message
          ? error.message
          : '문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Main Content - 2 Column */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

            {/* Left Column - Info */}
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight mb-6">
                DenJOY 팀에<br />문의하기
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed mb-10">
                도입 상담, 요금제 안내, 맞춤 기능 문의 등<br />
                무엇이든 편하게 연락 주세요.
              </p>

              {/* Trust Badges */}
              <p className="text-sm text-slate-400 font-medium mb-3">
                덴트웹 기본셋팅 전 제조사 데이터 적용
              </p>
              <p className="text-slate-300 font-black text-lg tracking-tight mb-12">
                OSSTEM · Dentium · Megagen · Neobiotech · DIO · Warantec · Dentis · Straumann · Magicore · 신흥 · 탑플란 · 포인트임플란트 등
              </p>

              {/* Testimonial Card */}
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed mb-6">
                  "도입 문의 후 하루 만에 세팅 완료됐습니다. 덴트웹 데이터 정리에 매주 2시간씩 쓰던 시간이 사라졌고, 재고 파악이 한눈에 되니까 발주 실수도 확 줄었어요."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">김</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">김OO 원장</p>
                    <p className="text-xs text-slate-400">서울 · 치과의원 (베타 테스터)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Form or Success */}
            <div>
              <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-200">
                {submitted ? (
                  <div>
                    {/* 접수 완료 헤더 */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900">문의가 접수되었습니다!</p>
                        <p className="text-xs text-slate-400 mt-0.5">영업일 기준 1~2일 내로 답변 드리겠습니다.</p>
                      </div>
                    </div>

                    {/* 접수 정보 요약 */}
                    <div className="bg-slate-50 rounded-xl p-5 mb-6 space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">접수 내용 확인</p>
                      {[
                        { label: '병원명', value: submitted.hospitalName },
                        { label: '담당자', value: `${submitted.contactName}${submitted.role ? ` (${submitted.role})` : ''}` },
                        { label: '이메일', value: submitted.email },
                        { label: '연락처', value: submitted.phone },
                        { label: '문의 유형', value: submitted.inquiryType },
                        { label: '수술 건수', value: submitted.weeklySurgeries },
                        { label: '접수번호', value: submitted.requestId || '생성 중' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start gap-3">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
                          <span className="text-sm font-semibold text-slate-700">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* 다음 행동(Primary 1개) */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                      <p className="text-sm font-black text-slate-800 mb-1">다음 단계 1순위: 무료 회원가입</p>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        재고/주문/식립 FAIL 관리를 지금 바로 시작할 수 있습니다.
                      </p>
                      <button
                        onClick={onGetStarted}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
                      >
                        무료로 시작하기 →
                      </button>
                      {onAnalyze && !isMobileViewport && (
                        <button
                          onClick={onAnalyze}
                          className="w-full mt-3 py-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                        >
                          또는 무료 데이터 건강도 진단 보기
                        </button>
                      )}
                      {onAnalyze && isMobileViewport && (
                        <button
                          onClick={onGetStarted}
                          className="w-full mt-3 py-2.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
                        >
                          모바일에서는 회원가입으로 바로 시작하기
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setSubmitted(null)}
                      className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      새 문의 보내기
                    </button>
                  </div>
                ) : (
                <>
                <h2 className="text-xl font-bold text-slate-900 mb-6">문의 양식</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-hospital-name" className="block text-sm font-bold text-slate-700 mb-1.5">병원명 <span className="text-rose-500">*</span></label>
                      <input id="contact-hospital-name" type="text" required placeholder="OO치과의원" value={form.hospitalName} onChange={e => set('hospitalName', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                    <div>
                      <label htmlFor="contact-person-name" className="block text-sm font-bold text-slate-700 mb-1.5">담당자명 <span className="text-rose-500">*</span></label>
                      <input id="contact-person-name" type="text" required placeholder="홍길동" value={form.contactName} onChange={e => set('contactName', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-bold text-slate-700 mb-1.5">이메일 <span className="text-rose-500">*</span></label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        placeholder="name@naver.com"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
                          form.email && !validateEmail(form.email)
                            ? 'border-rose-300 focus:ring-rose-400 bg-rose-50'
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      />
                      {form.email && !validateEmail(form.email) && (
                        <p className="text-xs text-rose-500 mt-1">올바른 이메일 형식을 입력해 주세요. (예: name@naver.com)</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="contact-role" className="block text-sm font-bold text-slate-700 mb-1.5">직위</label>
                      <input id="contact-role" type="text" placeholder="원장 / 실장 / 매니저" value={form.role} onChange={e => set('role', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="block text-sm font-bold text-slate-700 mb-1.5">연락처 <span className="text-rose-500">*</span></label>
                      <input
                        id="contact-phone"
                        type="tel"
                        required
                        inputMode="numeric"
                        placeholder="010-0000-0000"
                        value={form.phone}
                        onChange={e => set('phone', formatPhone(e.target.value))}
                        maxLength={13}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-weekly-surgeries" className="block text-sm font-bold text-slate-700 mb-1.5">주간 임플란트 수술 건수 <span className="text-rose-500">*</span></label>
                      <select id="contact-weekly-surgeries" required value={form.weeklySurgeries} onChange={e => set('weeklySurgeries', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-slate-700 bg-white">
                        <option value="">선택해 주세요</option>
                        <option>주 5건 미만</option>
                        <option>주 5~15건</option>
                        <option>주 15~30건</option>
                        <option>주 30건 이상</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-inquiry-type" className="block text-sm font-bold text-slate-700 mb-1.5">문의 유형 <span className="text-rose-500">*</span></label>
                    <select id="contact-inquiry-type" required value={form.inquiryType} onChange={e => set('inquiryType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-slate-700 bg-white">
                      <option value="">선택해 주세요</option>
                      <option>도입 상담</option>
                      <option>요금제 안내</option>
                      <option>기능 문의</option>
                      <option>기술 지원</option>
                      <option>파트너십 제안</option>
                      <option>기타</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-content" className="block text-sm font-bold text-slate-700 mb-1.5">상세 내용 <span className="text-rose-500">*</span></label>
                    <textarea id="contact-content" required rows={5} placeholder="궁금하신 점을 자유롭게 작성해 주세요." value={form.content} onChange={e => set('content', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none" />
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <input type="checkbox" id="agree" checked={form.agree} onChange={e => set('agree', e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <div className="text-xs text-slate-500 leading-relaxed">
                      <label htmlFor="agree" className="cursor-pointer">
                        개인정보 수집 및 이용에 동의합니다. 수집된 정보는 문의 응대 목적으로만 사용됩니다.
                      </label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button type="button" onClick={() => setShowPrivacy(true)} className="text-indigo-600 hover:underline">개인정보처리방침</button>
                        <span className="text-slate-300">·</span>
                        <button type="button" onClick={() => setShowTerms(true)} className="text-indigo-600 hover:underline">이용약관</button>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 mt-2 disabled:opacity-60">
                    {submitting ? '전송 중...' : '문의 보내기'}
                  </button>
                </form>
                <p className="text-xs text-slate-400 mt-4 text-center">
                  기술 지원이 필요하시면 <span className="text-indigo-600 font-medium">{BUSINESS_INFO.supportEmail}</span>로 이메일을 보내주세요.
                </p>
                </>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bottom Testimonials */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: '박OO 실장', clinic: '경기 · 치과의원', text: '"수술 기록과 재고가 자동으로 연동되니까, 어떤 사이즈가 부족한지 미리 알 수 있어서 발주 실수가 확 줄었어요."' },
              { name: '이OO 매니저', clinic: '부산 · 치과의원', text: '"여러 브랜드 재고를 한 곳에서 관리할 수 있게 됐습니다. 브랜드별 소모 패턴이 달라서 정말 유용해요."' },
              { name: '최OO 원장', clinic: '인천 · 치과의원', text: '"엑셀로 하루 종일 걸리던 작업이 3초면 끝납니다. 직원들 업무 부담이 크게 줄었어요."' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100">
                <p className="text-slate-600 leading-relaxed mb-6">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.clinic}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicInfoFooter showLegalLinks />
    </div>
    {toast && (
      <div className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] xl:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
        {toast.message}
      </div>
    )}
    {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
    {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
    </>
  );
};

export default ContactPage;
