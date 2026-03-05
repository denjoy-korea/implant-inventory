import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { sanitizeRichHtml } from '../../services/htmlSanitizer';
import type { SetConfirmModal } from './adminTypes';

export interface ManualEntry {
    id: string;
    title: string;
    content: string;
    category: string;
    updated_at: string;
    created_at: string;
}

export const MANUAL_CATEGORIES = ['일반', '회원/인증', '플랜/결제', '재고관리', '수술기록', '주문관리', '초기화', '시스템'];

export function useAdminManuals(setConfirmModal: SetConfirmModal) {
    const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
    const [manualEditing, setManualEditing] = useState<ManualEntry | null>(null);
    const [manualForm, setManualForm] = useState({ title: '', content: '', category: '일반' });
    const [manualSaving, setManualSaving] = useState(false);
    const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);

    const loadManuals = async () => {
        const { data } = await supabase.from('admin_manuals').select('*').order('created_at', { ascending: false });
        if (data) {
            const sanitized = (data as ManualEntry[]).map((entry) => ({
                ...entry,
                content: sanitizeRichHtml(String(entry.content || '')),
            }));
            setManualEntries(sanitized);
        }
    };

    const saveManual = async () => {
        if (!manualForm.title.trim() || !manualForm.content.trim()) return;
        setManualSaving(true);
        const safeContent = sanitizeRichHtml(manualForm.content);
        if (manualEditing) {
            await supabase.from('admin_manuals').update({
                title: manualForm.title, content: safeContent, category: manualForm.category, updated_at: new Date().toISOString(),
            }).eq('id', manualEditing.id);
        } else {
            await supabase.from('admin_manuals').insert({
                title: manualForm.title, content: safeContent, category: manualForm.category,
            });
        }
        await loadManuals();
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
        setManualSaving(false);
    };

    const deleteManual = (id: string) => {
        setConfirmModal({
            title: '매뉴얼 삭제',
            message: '이 매뉴얼을 삭제하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                await supabase.from('admin_manuals').delete().eq('id', id);
                if (manualSelectedId === id) setManualSelectedId(null);
                await loadManuals();
            },
        });
    };

    const handleCreateNewManual = () => {
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
        setManualSelectedId('__new__');
    };

    const handleSelectManualEntry = (entryId: string) => {
        setManualSelectedId(entryId);
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
    };

    const handleCancelManualEdit = () => {
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
        setManualSelectedId(null);
    };

    const handleStartManualEdit = (entry: ManualEntry) => {
        setManualEditing(entry);
        setManualForm({ title: entry.title, content: entry.content, category: entry.category });
    };

    return {
        manualEntries, setManualEntries,
        manualEditing, setManualEditing,
        manualForm, setManualForm,
        manualSaving, manualSelectedId, setManualSelectedId,
        loadManuals, saveManual, deleteManual,
        handleCreateNewManual, handleSelectManualEntry, handleCancelManualEdit, handleStartManualEdit,
    };
}
