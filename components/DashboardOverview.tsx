
import React, { useMemo } from 'react';
import { InventoryItem, Order, ExcelData, HospitalPlanState } from '../types';
import BrandChart from './BrandChart';
import FeatureGate from './FeatureGate';

interface DashboardOverviewProps {
    inventory: InventoryItem[];
    orders: Order[];
    surgeryMaster: Record<string, any[]>;
    fixtureData: ExcelData | null;
    onNavigate: (tab: any) => void;
    isAdmin: boolean;
    planState: HospitalPlanState | null;
    isMaster?: boolean;
    onStartTrial: () => void;
    onGoToPricing: () => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    inventory,
    orders,
    surgeryMaster,
    fixtureData,
    onNavigate,
    isAdmin,
    planState,
    isMaster,
    onStartTrial,
    onGoToPricing
}) => {
    const stockStats = useMemo(() => {
        const totalItems = inventory.length;
        const lowStockItems = inventory.filter(item => item.currentStock <= item.recommendedStock * 0.3).length;
        return { totalItems, lowStockItems };
    }, [inventory]);

    const orderStats = useMemo(() => {
        const pending = orders.filter(o => o.status === 'ordered').length;
        return { pending };
    }, [orders]);

    const surgeryStats = useMemo(() => {
        const records = surgeryMaster['수술기록지'] || [];
        const thisMonth = new Date().toISOString().slice(0, 7);
        const count = records.filter(r => String(r['날짜']).startsWith(thisMonth)).length;
        return { thisMonthCount: count };
    }, [surgeryMaster]);

    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayStr = dayNames[today.getDay()] + '요일';

    const kpiCards = [
        {
            label: '관리 품목',
            value: stockStats.totalItems,
            sub: '등록된 전체 품목 수',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            ),
            color: 'indigo',
            onClick: () => onNavigate('inventory_master'),
        },
        {
            label: '재고 부족',
            value: stockStats.lowStockItems,
            sub: '권장량 30% 미만',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            ),
            color: 'rose',
            alert: stockStats.lowStockItems > 0,
            onClick: () => onNavigate('inventory_master'),
        },
        {
            label: '이번 달 수술',
            value: surgeryStats.thisMonthCount,
            sub: '임플란트 수술 건수',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ),
            color: 'emerald',
            onClick: () => onNavigate('surgery_database'),
        },
        {
            label: '발주 진행',
            value: orderStats.pending,
            sub: '처리 대기 중',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            ),
            color: 'blue',
            onClick: () => onNavigate('order_management'),
        },
    ];

    const colorMap: Record<string, { bg: string; text: string; iconBg: string; alertBg: string }> = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100', alertBg: '' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-100', alertBg: 'bg-rose-50 border-rose-200' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100', alertBg: '' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100', alertBg: '' },
    };

    return (
        <div className="space-y-4">
            {/* KPI Strip */}
            <div className="grid grid-cols-4 gap-3">
                {kpiCards.map((card, i) => {
                    const c = colorMap[card.color];
                    return (
                        <button
                            key={i}
                            onClick={card.onClick}
                            className={`group bg-white px-4 py-4 rounded-xl border transition-all text-left hover:shadow-sm ${card.alert ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${c.iconBg} ${c.text} flex items-center justify-center flex-shrink-0`}>
                                    {card.icon}
                                </div>
                                <div>
                                    <div className={`text-2xl font-black leading-none ${card.alert ? c.text : 'text-slate-800'}`}>{card.value}</div>
                                    <p className="text-[11px] text-slate-400 mt-1">{card.label}</p>
                                </div>
                                {card.alert && (
                                    <span className="relative flex h-2 w-2 ml-auto">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Main Content - Full Width */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left: Chart or Getting Started */}
                <div className="lg:col-span-3">
                    {fixtureData && fixtureData.sheets[fixtureData.activeSheetName] ? (
                        <FeatureGate feature="brand_analytics" plan={planState?.plan ?? 'free'}>
                            <BrandChart data={fixtureData.sheets[fixtureData.activeSheetName]} onToggleBrand={() => { }} />
                        </FeatureGate>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-4">시작하기</h3>
                            <div className="space-y-3">
                                {[
                                    { step: '1', title: '덴트웹 픽스쳐 다운로드', desc: '덴트웹 → 기본설정 → 픽스쳐 → 엑셀 다운로드', done: false },
                                    { step: '2', title: '로우데이터 업로드', desc: '다운로드한 엑셀 파일을 DenJOY에 업로드', done: false, action: () => onNavigate('fixture_upload') },
                                    { step: '3', title: '데이터 설정/가공', desc: '사용 안함 처리, 브랜드 확인 후 재고 마스터 반영', done: false },
                                ].map((item, i) => (
                                    <div key={i} onClick={item.action} className={`flex items-start gap-3 p-3 rounded-lg ${item.action ? 'cursor-pointer hover:bg-indigo-50 transition-colors' : ''}`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.done ? '✓' : item.step}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{item.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => onNavigate('fixture_upload')} className="mt-4 w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                데이터 업로드 시작
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Quick Actions + Membership */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">바로가기</h3>
                        <div className="space-y-1">
                            {[
                                { label: '로우데이터 업로드', tab: 'fixture_upload', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>, bg: 'bg-indigo-50 text-indigo-600' },
                                { label: '재고 마스터', tab: 'inventory_master', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, bg: 'bg-emerald-50 text-emerald-600' },
                                { label: '수술기록 DB', tab: 'surgery_database', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, bg: 'bg-blue-50 text-blue-600' },
                                { label: '주문 관리', tab: 'order_management', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>, bg: 'bg-amber-50 text-amber-600' },
                                { label: 'FAIL 관리', tab: 'fail_management', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, bg: 'bg-rose-50 text-rose-600' },
                            ].map((item, i) => (
                                <button key={i} onClick={() => onNavigate(item.tab)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-all group">
                                    <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                                    <span className="text-sm font-medium text-slate-700 flex-1 text-left">{item.label}</span>
                                    <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
