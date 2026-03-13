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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function useAdminBilling() {
  const [allRows, setAllRows] = useState<DbBillingHistory[]>([]);
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState<{ id: string; name: string } | null>(null);

  // 검색 필터 상태
  const [statusSet, setStatusSet] = useState<Set<string>>(new Set());
  const [dateStart, setDateStart] = useState<string>(weekAgoStr);
  const [dateEnd, setDateEnd] = useState<string>(todayStr);
  const [nameSearch, setNameSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');

  const toggleStatus = useCallback((status: string) => {
    setStatusSet(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

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

  // grossRevenue: completed + refunded 행 모두 포함 (환불 전 실결제 총액)
  // totalRefunds: refunded 행의 refund_amount 합산만 사용 (이중 차감 방지)
  const grossRevenue = [...completedRows, ...refundedRows].reduce((s, r) => s + r.amount, 0);
  const totalRefunds = refundedRows.reduce((s, r) => s + (r.refund_amount ?? 0), 0);

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

  // displayRows: 필터 적용 (allRows 기준 — 테스트 결제도 표시)
  let displayRows = allRows;
  if (statusSet.size > 0) {
    displayRows = displayRows.filter(r => statusSet.has(r.payment_status));
  }
  if (dateStart) {
    displayRows = displayRows.filter(r => r.created_at.slice(0, 10) >= dateStart);
  }
  if (dateEnd) {
    displayRows = displayRows.filter(r => r.created_at.slice(0, 10) <= dateEnd);
  }
  if (nameSearch.trim()) {
    const q = nameSearch.trim().toLowerCase();
    displayRows = displayRows.filter(r => {
      const name = (r.hospital_name_snapshot || (r.hospital_id ? hospitals[r.hospital_id] : '') || '').toLowerCase();
      return name.includes(q);
    });
  }
  if (phoneSearch.trim()) {
    const q = phoneSearch.trim();
    displayRows = displayRows.filter(r => (r.phone_last4_snapshot || '').includes(q));
  }
  if (hospitalFilter) {
    displayRows = displayRows.filter(
      r => (r.hospital_id_snapshot || r.hospital_id) === hospitalFilter.id,
    );
  }

  const handleExcelDownload = useCallback(() => {
    const headers = ['거래일시', '결제번호', '결제상태', '플랜', '결제주기', '결제수단', '결제금액', '환불금액', '병원명', '연락처', '비고'];
    const rows = displayRows.map(r => [
      new Date(r.created_at).toLocaleString('ko-KR'),
      r.payment_ref || '',
      r.payment_status,
      r.plan,
      r.billing_cycle || '',
      r.payment_method || '',
      r.amount,
      r.refund_amount || 0,
      r.hospital_name_snapshot || '',
      r.phone_last4_snapshot ? `****-${r.phone_last4_snapshot}` : '',
      r.description || '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `결제내역_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRows]);

  return {
    allRows,
    displayRows,
    hospitals,
    loading,
    statusSet,
    toggleStatus,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    nameSearch,
    setNameSearch,
    phoneSearch,
    setPhoneSearch,
    deletingId,
    hospitalFilter,
    setHospitalFilter,
    kpi,
    load,
    handleDelete,
    handleExcelDownload,
  };
}
