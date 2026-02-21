import React, { useState } from 'react';
import { reviewService, ReviewType, ReviewRole, formatReviewDisplayName } from '../services/reviewService';

interface ReviewPopupProps {
  userId: string;
  reviewType: ReviewType;
  initialLastName?: string;
  initialRole?: ReviewRole;
  initialHospital?: string;
  onSubmitted: () => void;
  onSnooze: () => void;
  onClose: () => void;
}

const REVIEW_TYPE_LABEL: Record<ReviewType, { title: string; sub: string; badge: string; badgeColor: string }> = {
  initial: {
    title: 'DenJOY 사용 후기를 남겨주세요',
    sub: '소중한 후기가 더 나은 서비스를 만드는 데 도움이 됩니다.',
    badge: '첫 후기',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  '6month': {
    title: '6개월 사용 후기를 남겨주세요',
    sub: '6개월간 함께해 주셔서 감사합니다. 솔직한 후기를 들려주세요.',
    badge: '6개월 기념',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
};

export default function ReviewPopup({ userId, reviewType, initialLastName = '', initialRole, initialHospital = '', onSubmitted, onSnooze: _onSnooze, onClose }: ReviewPopupProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState('');
  const [snoozed, setSnoozed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = REVIEW_TYPE_LABEL[reviewType];
  const displayPreview = formatReviewDisplayName(
    initialLastName || null,
    initialRole ?? null,
    initialHospital || null,
  );
  const canSubmit = rating > 0 && content.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reviewService.createReview({
        userId,
        reviewType,
        rating,
        content,
        displayLastName: initialLastName || undefined,
        displayRole: initialRole,
        displayHospital: initialHospital || undefined,
      });
      reviewService.clearSnooze(userId, reviewType);
      onSubmitted();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '후기 저장에 실패했습니다.';
      setError(msg.includes('duplicate') ? '이미 후기를 작성하셨습니다.' : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reviewService.snooze(userId, reviewType, snoozed ? 7 : 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black mb-2 ${meta.badgeColor}`}>
                {meta.badge}
              </span>
              <h3 className="text-base font-black text-slate-900 leading-snug">{meta.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{meta.sub}</p>
            </div>
            <button onClick={handleClose} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 폼 */}
        <div className="px-6 py-5 space-y-5">
          {/* 별점 */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">평점 <span className="text-rose-500">*</span></p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <svg
                    className={`w-8 h-8 transition-colors ${star <= (hoveredRating || rating) ? 'text-amber-400' : 'text-slate-200'}`}
                    fill="currentColor" viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-xs font-bold text-amber-500">
                  {['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700">후기 내용 <span className="text-rose-500">*</span></p>
              <span className={`text-[10px] font-medium ${content.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>
                {content.length}/500
              </span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="실제 사용 경험을 자유롭게 작성해 주세요. (최소 10자)"
              maxLength={500}
              rows={4}
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 placeholder:text-slate-300"
            />
          </div>

          {/* 표시 미리보기 */}
          <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-1">후기에 표시되는 이름</p>
            <p className="text-sm font-bold text-slate-700">{displayPreview.line1}</p>
            {displayPreview.line2 && <p className="text-xs text-slate-500 mt-0.5">{displayPreview.line2}</p>}
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* 액션 */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '저장 중...' : '후기 바로 작성하기'}
          </button>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={snoozed}
                onChange={e => setSnoozed(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-[11px] text-slate-500">7일동안 알림 끄기</span>
            </label>
            <button
              onClick={handleClose}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
