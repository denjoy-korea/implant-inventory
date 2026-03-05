import { useState } from 'react';
import { operationLogService, AnalysisLead } from '../../services/operationLogService';
import type { AnalysisLeadFilter } from '../../components/system-admin/tabs/SystemAdminAnalysisLeadsTab';
import type { SetConfirmModal } from './adminTypes';

export const ANALYSIS_LEADS_PER_PAGE = 20;

export function useAdminAnalysisLeads(setConfirmModal: SetConfirmModal) {
    const [analysisLeads, setAnalysisLeads] = useState<AnalysisLead[]>([]);
    const [analysisLeadsTotal, setAnalysisLeadsTotal] = useState(0);
    const [analysisLeadFilter, setAnalysisLeadFilter] = useState<AnalysisLeadFilter>({});
    const [analysisLeadPage, setAnalysisLeadPage] = useState(0);
    const [analysisLeadsLoading, setAnalysisLeadsLoading] = useState(false);
    const [leadDeletingId, setLeadDeletingId] = useState<string | null>(null);

    const loadAnalysisLeads = async (page = analysisLeadPage, filter = analysisLeadFilter) => {
        setAnalysisLeadsLoading(true);
        const { data, total } = await operationLogService.getAnalysisLeads({
            type: filter.type,
            startDate: filter.startDate,
            endDate: filter.endDate,
            limit: ANALYSIS_LEADS_PER_PAGE,
            offset: page * ANALYSIS_LEADS_PER_PAGE,
        });
        setAnalysisLeads(data);
        setAnalysisLeadsTotal(total);
        setAnalysisLeadsLoading(false);
    };

    const handleAnalysisLeadFilterChange = (filter: AnalysisLeadFilter) => {
        setAnalysisLeadFilter(filter);
        setAnalysisLeadPage(0);
        loadAnalysisLeads(0, filter);
    };

    const handlePrevAnalysisLeadsPage = () => {
        const prevPage = Math.max(0, analysisLeadPage - 1);
        setAnalysisLeadPage(prevPage);
        loadAnalysisLeads(prevPage);
    };

    const handleNextAnalysisLeadsPage = () => {
        const nextPage = analysisLeadPage + 1;
        setAnalysisLeadPage(nextPage);
        loadAnalysisLeads(nextPage);
    };

    const handleDeleteLead = (id: string) => {
        setConfirmModal({
            title: '리드 삭제',
            message: '이 리드를 삭제하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setLeadDeletingId(id);
                const result = await operationLogService.deleteAnalysisLead(id);
                setLeadDeletingId(null);
                if (result.success) {
                    setAnalysisLeads(prev => prev.filter(l => l.id !== id));
                    setAnalysisLeadsTotal(prev => prev - 1);
                }
            },
        });
    };

    return {
        analysisLeads, analysisLeadsTotal, analysisLeadFilter, analysisLeadPage,
        analysisLeadsLoading, leadDeletingId,
        loadAnalysisLeads, handleAnalysisLeadFilterChange,
        handlePrevAnalysisLeadsPage, handleNextAnalysisLeadsPage, handleDeleteLead,
    };
}
