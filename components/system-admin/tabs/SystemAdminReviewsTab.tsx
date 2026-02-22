import React from 'react';
import { formatReviewDisplayName, ReviewRole, UserReview } from '../../../services/reviewService';

interface SystemAdminReviewsTabProps {
  reviewsLoading: boolean;
  reviews: UserReview[];
  reviewTogglingId: string | null;
  reviewDeletingId: string | null;
  reviewFeaturingId: string | null;
  onTogglePublic: (review: UserReview) => void;
  onToggleFeatured: (review: UserReview) => void;
  onRequestDelete: (review: UserReview) => void;
}

const SystemAdminReviewsTab: React.FC<SystemAdminReviewsTabProps> = ({
  reviewsLoading,
  reviews,
  reviewTogglingId,
  reviewDeletingId,
  reviewFeaturingId,
  onTogglePublic,
  onToggleFeatured,
  onRequestDelete,
}) => {
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const publicCount = reviews.filter((review) => review.is_public).length;
  const featuredCount = reviews.filter((review) => review.is_featured).length;

  return (
    <div>
      {!reviewsLoading && reviews.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { label: '전체 후기', value: `${reviews.length}건` },
            { label: '공개 중', value: `${publicCount}건` },
            { label: '평균 평점', value: `★ ${averageRating.toFixed(1)}` },
            { label: '기능소개 노출', value: `${featuredCount}건` },
          ].map((summary, index) => (
            <div key={index} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex-1 min-w-[100px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{summary.label}</p>
              <p className="text-lg font-black text-slate-800">{summary.value}</p>
            </div>
          ))}
        </div>
      )}

      {reviewsLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">등록된 후기가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const displayName = formatReviewDisplayName(
              review.display_last_name,
              review.display_role as ReviewRole | null,
              review.display_hospital,
            );
            const isToggling = reviewTogglingId === review.id;
            const isDeleting = reviewDeletingId === review.id;
            const isFeaturing = reviewFeaturingId === review.id;
            return (
              <div key={review.id} className={`bg-white rounded-xl border p-4 transition-colors ${review.is_featured ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onToggleFeatured(review)}
                    disabled={isFeaturing}
                    title={review.is_featured ? '기능소개 노출 해제' : '기능소개에 노출'}
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 border-2 ${review.is_featured ? 'bg-amber-400 border-amber-400 text-white' : 'border-slate-300 hover:border-amber-400'}`}
                  >
                    {review.is_featured && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${review.review_type === 'initial' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {review.review_type === 'initial' ? '첫 후기' : '6개월'}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <svg key={score} className={`w-3.5 h-3.5 ${score <= review.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${review.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {review.is_public ? '공개' : '비공개'}
                      </span>
                      {review.is_featured && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          ★ 기능소개 노출
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed mb-2">{review.content}</p>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-slate-600">{displayName.line1}</span>
                      {displayName.line2 && <span className="text-xs text-slate-400">{displayName.line2}</span>}
                      <span className="text-[10px] text-slate-400 ml-auto">{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onTogglePublic(review)}
                      disabled={isToggling}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${review.is_public ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                    >
                      {isToggling ? '...' : review.is_public ? '비공개' : '공개'}
                    </button>
                    <button
                      onClick={() => onRequestDelete(review)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? '...' : '삭제'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SystemAdminReviewsTab;
