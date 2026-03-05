
import React, { useState, useEffect } from 'react';
import { reviewService, UserReview, ReviewRole, formatReviewDisplayName } from '../../services/reviewService';

const REVIEW_ROLES_LIST: ReviewRole[] = ['원장', '실장', '팀장', '스탭'];

const REVIEW_TYPE_META: Record<string, { label: string; color: string }> = {
    initial: { label: '첫 후기', color: 'bg-indigo-100 text-indigo-700' },
    '6month': { label: '6개월 기념', color: 'bg-emerald-100 text-emerald-700' },
};

function StarDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

interface ReviewsTabProps {
    userId: string;
    showToast: (msg: string, type: 'success' | 'error') => void;
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ userId, showToast }) => {
    const [reviews, setReviews] = useState<UserReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRating, setEditRating] = useState(0);
    const [editHovered, setEditHovered] = useState(0);
    const [editContent, setEditContent] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editRole, setEditRole] = useState<ReviewRole | ''>('');
    const [editHospital, setEditHospital] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        reviewService.getMyReviews(userId)
            .then(setReviews)
            .catch(() => showToast('후기를 불러오지 못했습니다.', 'error'))
            .finally(() => setLoading(false));
    }, [userId]);

    const startEdit = (r: UserReview) => {
        setEditingId(r.id);
        setEditRating(r.rating);
        setEditHovered(0);
        setEditContent(r.content);
        setEditLastName(r.display_last_name ?? '');
        setEditRole((r.display_role as ReviewRole) ?? '');
        setEditHospital(r.display_hospital ?? '');
    };

    const handleSave = async (id: string) => {
        if (editRating === 0 || editContent.trim().length < 10) return;
        setIsSaving(true);
        try {
            const updated = await reviewService.updateReview(id, {
                rating: editRating,
                content: editContent,
                displayLastName: editLastName || undefined,
                displayRole: editRole as ReviewRole || undefined,
                displayHospital: editHospital || undefined,
            });
            setReviews(prev => prev.map(r => r.id === id ? updated : r));
            setEditingId(null);
            showToast('후기가 수정되었습니다.', 'success');
        } catch {
            showToast('수정에 실패했습니다.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    if (loading) return <div className="py-10 text-center text-sm text-slate-400">불러오는 중...</div>;

    if (reviews.length === 0) {
        return (
            <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">아직 작성한 후기가 없습니다</p>
                <p className="text-xs text-slate-400 mt-1">대시보드에서 후기 작성 알림을 확인해 보세요</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map(review => {
                const typeMeta = REVIEW_TYPE_META[review.review_type] ?? { label: review.review_type, color: 'bg-slate-100 text-slate-600' };
                const displayName = formatReviewDisplayName(review.display_last_name, review.display_role as ReviewRole | null, review.display_hospital);
                const isEditing = editingId === review.id;
                const editPreview = formatReviewDisplayName(editLastName || null, editRole as ReviewRole || null, editHospital || null);

                return (
                    <div key={review.id} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeMeta.color}`}>{typeMeta.label}</span>
                                <StarDisplay rating={isEditing ? editRating : review.rating} />
                            </div>
                            {!isEditing ? (
                                <button onClick={() => startEdit(review)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    수정
                                </button>
                            ) : (
                                <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">취소</button>
                            )}
                        </div>

                        <div className="px-4 py-4">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-1.5">평점</p>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button key={s} type="button" onClick={() => setEditRating(s)} onMouseEnter={() => setEditHovered(s)} onMouseLeave={() => setEditHovered(0)} className="transition-transform hover:scale-110">
                                                    <svg className={`w-7 h-7 transition-colors ${s <= (editHovered || editRating) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-[10px] font-bold text-slate-500">후기 내용</p>
                                            <span className={`text-[10px] ${editContent.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>{editContent.length}/500</span>
                                        </div>
                                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={500} rows={4} className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 placeholder:text-slate-300" placeholder="실제 사용 경험을 자유롭게 작성해 주세요. (최소 10자)" />
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-2">표시 정보 <span className="font-normal text-slate-400">(선택)</span></p>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">성 (한 글자)</label>
                                                <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value.slice(0, 2))} maxLength={2} placeholder="예: 김" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 placeholder:text-slate-300" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">역할</label>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {REVIEW_ROLES_LIST.map(r => (
                                                        <button key={r} type="button" onClick={() => setEditRole(prev => prev === r ? '' : r)} className={`text-xs font-bold py-1.5 rounded-lg border transition-colors ${editRole === r ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>{r}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <input type="text" value={editHospital} onChange={e => setEditHospital(e.target.value.slice(0, 30))} maxLength={30} placeholder="소속 병원 (선택)" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 placeholder:text-slate-300" />
                                        {(editLastName || editRole || editHospital) && (
                                            <div className="mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] text-slate-400 mb-0.5">표시 미리보기</p>
                                                <p className="text-xs font-bold text-slate-700">{editPreview.line1}</p>
                                                {editPreview.line2 && <p className="text-[11px] text-slate-500">{editPreview.line2}</p>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">취소</button>
                                        <button onClick={() => handleSave(review.id)} disabled={isSaving || editRating === 0 || editContent.trim().length < 10} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{isSaving ? '저장 중...' : '저장'}</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{review.content}</p>
                                    <div className="mt-3 flex items-end justify-between gap-2">
                                        <div>
                                            {(review.display_last_name || review.display_role) && (
                                                <p className="text-xs font-bold text-slate-600">{displayName.line1}</p>
                                            )}
                                            {displayName.line2 && <p className="text-[11px] text-slate-400">{displayName.line2}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[10px] text-slate-400">작성일 {formatDate(review.created_at)}</p>
                                            {review.updated_at !== review.created_at && (
                                                <p className="text-[10px] text-slate-400">수정일 {formatDate(review.updated_at)}</p>
                                            )}
                                        </div>
                                    </div>
                                    {review.is_public && (
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-[10px] text-emerald-600 font-medium">홈에 공개됨</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ReviewsTab;
