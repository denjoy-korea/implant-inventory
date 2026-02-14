
import React from 'react';
import { ExcelData, DashboardTab } from '../types';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  fixtureData: ExcelData | null;
  surgeryData: ExcelData | null;
  isAdmin: boolean;
  isMaster: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, fixtureData, surgeryData, isAdmin, isMaster }) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen shrink-0 transition-all duration-300 z-[200] shadow-xl">
      <div className="p-6 pb-2">
        <div className="flex items-center space-x-2 mb-6">
          <img src="/logo.png" alt="DentWeb Data Processor" className="h-8 w-auto object-contain brightness-0 invert" />
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] text-slate-400 font-medium leading-none">Powered by</span>
            <span className="text-lg font-bold tracking-tight text-white">DenJOY</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-sidebar-scrollbar px-6 pb-6 space-y-8">

        {/* 그룹 0: 대시보드 오버뷰 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Overview</h3>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              대시보드 홈
            </button>
          </nav>
        </div>

        {/* 그룹 1: 픽스쳐 데이터 셋팅 (관리자 전용) */}
        {isAdmin && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Fixture Setting</h3>
            <nav className="space-y-1">
              <button
                onClick={() => onTabChange('fixture_upload')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'fixture_upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                로우데이터 업로드
              </button>
              <button
                onClick={() => onTabChange('fixture_edit')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'fixture_edit' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'} ${!fixtureData ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  데이터 설정/가공
                </div>
                {fixtureData && <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
              </button>
            </nav>
          </div>
        )}

        {/* 그룹 2: 재고 및 수술 통계 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Master Management</h3>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('inventory_master')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'inventory_master' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              재고 관리 마스터
            </button>
            <button
              onClick={() => onTabChange('order_management')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'order_management' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              주문 관리 마스터
            </button>
            <button
              onClick={() => onTabChange('surgery_database')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'surgery_database' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                수술 기록 데이터베이스
              </div>
            </button>
            <button
              onClick={() => onTabChange('fail_management')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'fail_management' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              식립 FAIL 관리
            </button>
          </nav>
        </div>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">System Online</p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            All systems operational.<br />
            Real-time sync active.
          </p>
        </div>

        {isMaster && (
          <div className="pt-6 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">ADMINISTRATION</div>
            <nav className="space-y-1">
              <button
                onClick={() => onTabChange('member_management')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'member_management'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <svg className={`w-5 h-5 transition-colors ${activeTab === 'member_management' ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-medium">구성원 관리</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      <style>{`
        .custom-sidebar-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
