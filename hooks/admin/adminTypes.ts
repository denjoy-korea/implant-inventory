/** 어드민 서브훅 공유 타입 */

export interface ConfirmModalState {
    title: string;
    message: string;
    confirmColor?: 'rose' | 'amber' | 'indigo';
    confirmLabel?: string;
    onConfirm: () => void;
}

export type ShowToast = (message: string, type: 'success' | 'error' | 'info') => void;
export type SetConfirmModal = (modal: ConfirmModalState | null) => void;
