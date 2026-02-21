import React, { useEffect, useState } from 'react';
import { reviewService, UserReview, ReviewRole, formatReviewDisplayName } from '../services/reviewService';

interface ReviewsPageProps {
  onBack?: () => void;
}

type RoleFilter = 'all' | ReviewRole;
type RatingFilter = 0 | 1 | 2 | 3 | 4 | 5;

const ROLE_FILTERS: { label: string; value: RoleFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '원장', value: '원장' },
  { label: '실장', value: '실장' },
  { label: '팀장', value: '팀장' },
  { label: '스탭', value: '스탭' },
];

export default function ReviewsPage({ onBack }: ReviewsPageProps) {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(0);

  useEffect(() => {
    reviewService.getPublicReviews(100)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = reviews.filter(r => {
    if (roleFilter !== 'all' && r.display_role !== roleFilter) return false;
    if (ratingFilter !== 0 && r.rating !== ratingFilter) return false;
    return true;
  });

  // 통계
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* 평점 요약 */}
        {!isLoading && reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-8 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start">
              {/* 평균 점수 */}
              <div className="text-center flex-shrink-0">
                <p className="text-6xl font-black text-slate-900 leading-none">{avg.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 mt-2 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} className={`w-5 h-5 ${s <= Math.round(avg) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-slate-400 font-medium">{reviews.length}개 후기</p>
              </div>

              {/* 별점 분포 */}
              <div className="flex-1 w-full space-y-2">
                {dist.map(({ star, count, pct }) => (
                  <button
                    key={star}
                    onClick={() => setRatingFilter(ratingFilter === star ? 0 : star as RatingFilter)}
                    className={`w-full flex items-center gap-3 group transition-all ${ratingFilter === star ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                  >
                    <span className="text-xs font-bold text-slate-500 w-6 text-right flex-shrink-0">{star}★</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${ratingFilter === star ? 'bg-amber-400' : 'bg-amber-300 group-hover:bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right flex-shrink-0">{count}건</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 필터 */}
        {!isLoading && reviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {ROLE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setRoleFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  roleFilter === f.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {reviews.filter(r => r.display_role === f.value).length}
                  </span>
                )}
              </button>
            ))}
            {ratingFilter !== 0 && (
              <button
                onClick={() => setRatingFilter(0)}
                className="px-4 py-1.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
              >
                {ratingFilter}★
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 후기 목록 */}
        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500">아직 공개된 후기가 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">첫 번째 후기를 작성해 보세요</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            해당 조건의 후기가 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(review => {
              const displayName = formatReviewDisplayName(
                review.display_last_name,
                review.display_role as ReviewRole | null,
                review.display_hospital,
              );
              return (
                <div key={review.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col hover:shadow-md transition-shadow">
                  {/* 별점 + 타입 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    {review.review_type === '6month' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">6개월 기념</span>
                    )}
                  </div>

                  {/* 내용 */}
                  <p className="text-sm text-slate-700 leading-relaxed flex-1 mb-4">
                    &ldquo;{review.content}&rdquo;
                  </p>

                  {/* 작성자 */}
                  <div className="flex items-center gap-2.5 pt-3 border-t border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {(review.display_last_name ?? '익').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700">{displayName.line1}</p>
                      {displayName.line2 && <p className="text-[10px] text-slate-400 truncate">{displayName.line2}</p>}
                    </div>
                    <span className="ml-auto text-[10px] text-slate-300 flex-shrink-0">
                      {new Date(review.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 결과 카운트 */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-center mt-8">
            {filtered.length}개의 후기를 표시 중
          </p>
        )}
      </div>
    </div>
  );
}
