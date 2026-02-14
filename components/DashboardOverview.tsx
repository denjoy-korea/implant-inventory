
import React, { useMemo } from 'react';
import { InventoryItem, Order, ExcelData } from '../types';
import BrandChart from './BrandChart';

interface DashboardOverviewProps {
    inventory: InventoryItem[];
    orders: Order[];
    surgeryMaster: Record<string, any[]>;
    fixtureData: ExcelData | null;
    onNavigate: (tab: any) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    inventory,
    orders,
    surgeryMaster,
    fixtureData,
    onNavigate
}) => {
    // 1. 재고 현황 통계
    const stockStats = useMemo(() => {
        const totalItems = inventory.length;
        const lowStockItems = inventory.filter(item => item.currentStock <= item.recommendedStock * 0.3).length; // 30% 이하
        const totalStockCount = inventory.reduce((sum, item) => sum + item.currentStock, 0);
        const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * 100000), 0); // 임의 단가 적용 (실제 단가가 없으므로)
        return { totalItems, lowStockItems, totalStockCount, totalValue };
    }, [inventory]);

    // 2. 주문 현황 통계
    const orderStats = useMemo(() => {
        const pending = orders.filter(o => o.status === 'ordered').length;
        const receivedToday = orders.filter(o => o.status === 'received' && o.receivedDate?.startsWith(new Date().toISOString().split('T')[0])).length;
        return { pending, receivedToday };
    }, [orders]);

    // 3. 수술 현황 (이번 달)
    const surgeryStats = useMemo(() => {
        const records = surgeryMaster['수술기록지'] || [];
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const count = records.filter(r => String(r['날짜']).startsWith(thisMonth)).length;
        return { thisMonthCount: count };
    }, [surgeryMaster]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header Section */}
            <div className="flex justify-between items-end pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
                    <p className="text-slate-500 text-sm mt-1">실시간 재고 및 수술 현황 요약</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Today</p>
                    <p className="text-lg font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Total Items</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 mb-1">{stockStats.totalItems}</div>
                    <p className="text-xs text-slate-500 font-medium">관리 중인 품목 수</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('inventory_master')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <span className="text-xs font-bold text-rose-100 bg-rose-500 px-2 py-1 rounded text-white">Action Needed</span>
                    </div>
                    <div className="text-3xl font-black text-rose-600 mb-1">{stockStats.lowStockItems}</div>
                    <p className="text-xs text-rose-400 font-bold">재고 부족 (권장량 30% 미만)</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">This Month</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 mb-1">{surgeryStats.thisMonthCount}</div>
                    <p className="text-xs text-slate-500 font-medium">이번 달 임플란트 수술 건수</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('order_management')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Processing</span>
                    </div>
                    <div className="text-3xl font-black text-slate-800 mb-1">{orderStats.pending}</div>
                    <p className="text-xs text-slate-500 font-medium">발주 진행 중인 건</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Brand Chart (Using existing component) */}
                <div className="lg:col-span-2 space-y-6">
                    {fixtureData && fixtureData.sheets[fixtureData.activeSheetName] ? (
                        <BrandChart data={fixtureData.sheets[fixtureData.activeSheetName]} onToggleBrand={() => { }} />
                    ) : (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">픽스쳐 데이터가 없습니다</h3>
                            <p className="text-slate-500 text-sm mt-2">상단 메뉴에서 [로우데이터 업로드]를 진행해주세요.</p>
                            <button onClick={() => onNavigate('fixture_upload')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">
                                데이터 업로드 바로가기
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Col: Recent Activity & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Quick Actions
                        </h3>
                        <div className="space-y-3">
                            <button onClick={() => onNavigate('fixture_upload')} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-700">데이터 업로드</span>
                                </div>
                                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>

                            <button onClick={() => onNavigate('inventory_master')} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-700">재고 현황 확인</span>
                                </div>
                                <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <h3 className="text-white font-bold text-lg mb-1">Pro Membership</h3>
                            <p className="text-slate-400 text-xs mb-4">현재 모든 기능을 제한 없이 이용하고 계십니다.</p>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                Active Status
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
