import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { DbBillingHistory } from '../../types';

export interface BillingKpi {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  refundedCount: number;
  pendingCount: number;
  grossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  cancelledAmount: number;
}

export function useAdminBilling() {
  const [allRows, setAllRows] = useState<DbBillingHistory[]>([]);
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [billingRes, hospitalRes] = await Promise.all([
      supabase
        .from('billing_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('hospitals').select('id, name'),
    ]);

    setAllRows((billingRes.data as DbBillingHistory[]) ?? []);

    if (hospitalRes.data) {
      const map: Record<string, string> = {};
      hospitalRes.data.forEach((h: { id: string; name: string }) => { map[h.id] = h.name; });
      setHospitals(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 결제 내역을 삭제하시겠습니까? (테스트 전용)')) return;
    setDeletingId(id);
    const { error } = await supabase.from('billing_history').delete().eq('id', id);
    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      setAllRows(prev => prev.filter(r => r.id !== id));
    }
    setDeletingId(null);
  }, []);

  // KPI: 항상 전체 기준, 테스트 결제 제외
  const liveRows = allRows.filter(r => !r.is_test_payment);
  const completedRows = liveRows.filter(r => r.payment_status === 'completed');
  const cancelledRows = liveRows.filter(r => r.payment_status === 'cancelled');
  const refundedRows = liveRows.filter(r => r.payment_status === 'refunded');
  const pendingRows = liveRows.filter(r => r.payment_status === 'pending');

  const grossRevenue = completedRows.reduce((s, r) => s + r.amount, 0);
  const totalRefunds = liveRows.reduce((s, r) => s + (r.refund_amount ?? 0), 0);

  const kpi: BillingKpi = {
    totalCount: liveRows.length,
    completedCount: completedRows.length,
    cancelledCount: cancelledRows.length,
    refundedCount: refundedRows.length,
    pendingCount: pendingRows.length,
    grossRevenue,
    totalRefunds,
    netRevenue: grossRevenue - totalRefunds,
    cancelledAmount: cancelledRows.reduce((s, r) => s + r.amount, 0),
  };

  // displayRows: filter + hospitalFilter 적용 (allRows 기준 — 테스트 결제도 표시)
  let displayRows = allRows;
  if (filter !== 'all') displayRows = displayRows.filter(r => r.payment_status === filter);
  if (hospitalFilter) {
    displayRows = displayRows.filter(
      r => (r.hospital_id_snapshot || r.hospital_id) === hospitalFilter.id,
    );
  }

  return {
    allRows,
    displayRows,
    hospitals,
    loading,
    filter,
    setFilter,
    deletingId,
    hospitalFilter,
    setHospitalFilter,
    kpi,
    load,
    handleDelete,
  };
}
