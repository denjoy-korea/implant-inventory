import React, { useState } from 'react';
import { consultationService, TimeSlot, TIME_SLOT_LABELS, CreateConsultationData } from '../services/consultationService';
import PublicInfoFooter from './shared/PublicInfoFooter';

interface ConsultationPageProps {
  onBack: () => void;
  initialEmail?: string;
  initialHospitalName?: string;
  initialContact?: string;
  initialRegion?: string;
}

const ConsultationPage: React.FC<ConsultationPageProps> = ({
  onBack,
  initialEmail = '',
  initialHospitalName = '',
  initialContact = '',
  initialRegion = '',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [hospitalName, setHospitalName] = useState(initialHospitalName);
  const [region, setRegion] = useState(initialRegion);
  const [contact, setContact] = useState(initialContact);

  const prefilled = { email: !!initialEmail, hospitalName: !!initialHospitalName, region: !!initialRegion, contact: !!initialContact };
  const prefilledClass = 'bg-slate-50 text-slate-500 cursor-not-allowed select-none';
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<TimeSlot | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !email || !hospitalName) return;

    setIsSubmitting(true);
    setError('');
    try {
      const data: CreateConsultationData = {
        name,
        email,
        hospital_name: hospitalName,
        ...(region ? { region } : {}),
        ...(contact ? { contact } : {}),
        ...(preferredDate ? { preferred_date: preferredDate } : {}),
        ...(preferredTimeSlot ? { preferred_time_slot: preferredTimeSlot } : {}),
        ...(notes ? { notes } : {}),
      };
      await consultationService.create(data);
      setSubmitted(true);
    } catch {
      setError('신청 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">상담 신청 완료!</h2>
            <p className="text-sm font-semibold text-indigo-600 mb-3">접수가 완료되었습니다</p>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              담당자가 영업일 기준 1일 이내에 입력하신 연락처로 연락드립니다.
              일정 조율 후 상담 날짜가 확정되면 별도로 안내해 드립니다.
            </p>
            <button
              onClick={onBack}
              className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              돌아가기
            </button>
          </div>
        </div>
        <PublicInfoFooter showLegalLinks />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전으로
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">상담 일정 잡기</h1>
              <p className="text-sm text-slate-500">DenJOY 전문 담당자와 1:1 상담을 진행합니다</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-indigo-700 leading-relaxed">
                상세 분석 리포트 검토 및 맞춤형 운영 개선 방안을 상담해 드립니다.
                선호 날짜와 시간을 알려주시면 담당자가 일정을 확인 후 연락드립니다.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">기본 정보</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="담당자 성함"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  이메일 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { if (!prefilled.email) setEmail(e.target.value); }}
                  readOnly={prefilled.email}
                  placeholder="example@hospital.com"
                  required
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm transition-all ${prefilled.email ? prefilledClass : 'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    병원명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={e => { if (!prefilled.hospitalName) setHospitalName(e.target.value); }}
                    readOnly={prefilled.hospitalName}
                    placeholder="치과 병원명"
                    required
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm transition-all ${prefilled.hospitalName ? prefilledClass : 'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">지역</label>
                  <input
                    type="text"
                    value={region}
                    onChange={e => { if (!prefilled.region) setRegion(e.target.value); }}
                    readOnly={prefilled.region}
                    placeholder="서울 강남구"
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm transition-all ${prefilled.region ? prefilledClass : 'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">연락처</label>
                <input
                  type="tel"
                  value={contact}
                  onChange={e => { if (!prefilled.contact) setContact(e.target.value); }}
                  readOnly={prefilled.contact}
                  placeholder="010-0000-0000"
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm transition-all ${prefilled.contact ? prefilledClass : 'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'}`}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">선호 일정</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">선호 날짜</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">선호 시간대</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(TIME_SLOT_LABELS) as [TimeSlot, string][]).map(([slot, label]) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPreferredTimeSlot(prev => prev === slot ? '' : slot)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        preferredTimeSlot === slot
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">추가 메모</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="궁금한 점이나 미리 알려주고 싶은 내용을 자유롭게 작성해 주세요"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !name || !email || !hospitalName}
            className="w-full py-4 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                신청 중...
              </span>
            ) : '상담 신청하기'}
          </button>
        </form>
      </div>
      <PublicInfoFooter showLegalLinks />
    </div>
  );
};

export default ConsultationPage;
