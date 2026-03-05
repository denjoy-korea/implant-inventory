import { useState } from 'react';
import { reviewService, UserReview } from '../../services/reviewService';
import type { ShowToast, SetConfirmModal } from './adminTypes';

export function useAdminReviews(showToast: ShowToast, setConfirmModal: SetConfirmModal) {
    const [allReviews, setAllReviews] = useState<UserReview[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewTogglingId, setReviewTogglingId] = useState<string | null>(null);
    const [reviewDeletingId, setReviewDeletingId] = useState<string | null>(null);
    const [reviewFeaturingId, setReviewFeaturingId] = useState<string | null>(null);

    const loadReviews = () => {
        setReviewsLoading(true);
        reviewService.getAllReviews()
            .then(setAllReviews)
            .catch(() => showToast('후기 목록을 불러오지 못했습니다.', 'error'))
            .finally(() => setReviewsLoading(false));
    };

    const handleToggleReviewPublic = async (review: UserReview) => {
        setReviewTogglingId(review.id);
        try {
            await reviewService.togglePublic(review.id, !review.is_public);
            setAllReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_public: !review.is_public } : r));
        } catch {
            showToast('공개 설정 변경에 실패했습니다.', 'error');
        } finally {
            setReviewTogglingId(null);
        }
    };

    const handleToggleReviewFeatured = async (review: UserReview) => {
        setReviewFeaturingId(review.id);
        try {
            await reviewService.toggleFeatured(review.id, !review.is_featured);
            setAllReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_featured: !review.is_featured } : r));
        } catch {
            showToast('기능소개 설정 변경에 실패했습니다.', 'error');
        } finally {
            setReviewFeaturingId(null);
        }
    };

    const handleDeleteReview = async (id: string) => {
        setReviewDeletingId(id);
        try {
            await reviewService.deleteReview(id);
            setAllReviews(prev => prev.filter(r => r.id !== id));
            showToast('후기가 삭제되었습니다.', 'success');
        } catch {
            showToast('후기 삭제에 실패했습니다.', 'error');
        } finally {
            setReviewDeletingId(null);
        }
    };

    const requestDeleteReview = (review: UserReview) => {
        setConfirmModal({
            title: '후기 삭제',
            message: '이 후기를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: () => {
                setConfirmModal(null);
                handleDeleteReview(review.id);
            },
        });
    };

    return {
        allReviews, reviewsLoading, reviewTogglingId, reviewDeletingId, reviewFeaturingId,
        loadReviews, handleToggleReviewPublic, handleToggleReviewFeatured, requestDeleteReview,
    };
}
