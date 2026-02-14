
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import AuthForm from './components/AuthForm';
import UploadSection from './components/UploadSection';
import ExcelTable from './components/ExcelTable';
import Sidebar from './components/Sidebar';
import BrandChart from './components/BrandChart';
import NewDataModal from './components/NewDataModal';
import AdminPanel from './components/AdminPanel';
import InventoryManager from './components/InventoryManager';
import FailManager from './components/FailManager';
import OrderManager from './components/OrderManager';
import SurgeryStats from './components/SurgeryStats';
import DashboardOverview from './components/DashboardOverview';
import MemberManager from './components/MemberManager';
import StaffWaitingRoom from './components/StaffWaitingRoom';
import UserProfile from './components/UserProfile';
import PricingPage from './components/PricingPage';
import ContactPage from './components/ContactPage';
import SystemAdminDashboard from './components/SystemAdminDashboard';
import { AppState, ExcelData, ExcelRow, User, View, DashboardTab, UploadType, InventoryItem, ExcelSheet, Order, OrderStatus } from './types';
import { parseExcelFile, downloadExcelFile, extractLengthFromSize } from './services/excelService';
import { getSizeMatchKey } from './services/sizeNormalizer';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    // 1. Load User First
    const savedUserJson = localStorage.getItem('app_user');
    const savedUser = savedUserJson ? JSON.parse(savedUserJson) : null;

    // 2. Determine Storage Keys based on User's Hospital ID
    const hospitalPrefix = savedUser?.hospitalId ? `hospital_${savedUser.hospitalId}_` : '';

    // Legacy support: if no hospitalId (old user), use old keys or migrate?
    // For now, if no hospitalId, we might want to force logout or use default keys.
    // Let's assume valid users have hospitalId as per new AuthForm.

    const savedInv = localStorage.getItem(`${hospitalPrefix}app_inventory`);
    const savedSurgeryMaster = localStorage.getItem(`${hospitalPrefix}app_surgery_master`);
    const savedOrders = localStorage.getItem(`${hospitalPrefix}app_orders`);
    const savedFixtureData = localStorage.getItem(`${hospitalPrefix}app_fixture_data`);

    return {
      fixtureData: savedFixtureData ? JSON.parse(savedFixtureData) : null,
      surgeryData: null,
      fixtureFileName: null,
      surgeryFileName: null,
      inventory: savedInv ? JSON.parse(savedInv) : [],
      orders: savedOrders ? JSON.parse(savedOrders) : [],
      surgeryMaster: savedSurgeryMaster ? JSON.parse(savedSurgeryMaster) : {},
      activeSurgerySheetName: '수술기록지',
      selectedFixtureIndices: {},
      selectedSurgeryIndices: {},
      isLoading: false,
      user: savedUser,
      currentView: savedUser ? 'dashboard' : 'landing',
      dashboardTab: 'overview',
      isFixtureLengthExtracted: false,
      fixtureBackup: null,
      showProfile: false,
    };
  });

  const isAdmin = state.user?.email === 'admin' || state.user?.email === 'admin@admin.com';

  // Persistence Effects with Hospital Isolation
  useEffect(() => {
    if (state.user?.hospitalId) {
      const prefix = `hospital_${state.user.hospitalId}_`;
      localStorage.setItem(`${prefix}app_inventory`, JSON.stringify(state.inventory));
    }
  }, [state.inventory, state.user?.hospitalId]);

  useEffect(() => {
    if (state.user?.hospitalId) {
      const prefix = `hospital_${state.user.hospitalId}_`;
      localStorage.setItem(`${prefix}app_surgery_master`, JSON.stringify(state.surgeryMaster));
    }
  }, [state.surgeryMaster, state.user?.hospitalId]);

  useEffect(() => {
    if (state.user?.hospitalId) {
      const prefix = `hospital_${state.user.hospitalId}_`;
      localStorage.setItem(`${prefix}app_orders`, JSON.stringify(state.orders));
    }
  }, [state.orders, state.user?.hospitalId]);

  // Persist Fixture Data (Optional but good for UX)
  useEffect(() => {
    if (state.user?.hospitalId && state.fixtureData) {
      const prefix = `hospital_${state.user.hospitalId}_`;
      localStorage.setItem(`${prefix}app_fixture_data`, JSON.stringify(state.fixtureData));
    }
  }, [state.fixtureData, state.user?.hospitalId]);

  // Persist User Session
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('app_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('app_user');
    }
  }, [state.user]);

  // Load data when user logs in (if not loaded initially)
  useEffect(() => {
    if (state.user?.hospitalId && state.currentView === 'dashboard') {
      const prefix = `hospital_${state.user.hospitalId}_`;

      // Check if we need to reload data (e.g. after login)
      // This is a simplified approach; ideally we might want to separate data loading from auth.
      // But since we load everything into state in `useState` init, we need to ensure state is updated when user changes.

      // actually, `useState` init only runs once. If user logs in via `setState`, the initial state logic won't rerun.
      // So we need this effect to load data when `state.user` changes from null to something.
    }
  }, [state.user]);

  // Refined Data Loading on Login:
  // When user switches from null to logged in, we must load their data.
  const handleLoginSuccess = (user: User) => {
    const prefix = `hospital_${user.hospitalId}_`;
    const savedInv = localStorage.getItem(`${prefix}app_inventory`);
    const savedSurgeryMaster = localStorage.getItem(`${prefix}app_surgery_master`);
    const savedOrders = localStorage.getItem(`${prefix}app_orders`);
    const savedFixtureData = localStorage.getItem(`${prefix}app_fixture_data`);

    setState(prev => ({
      ...prev,
      user: user,
      currentView: 'dashboard',
      dashboardTab: 'overview',
      inventory: savedInv ? JSON.parse(savedInv) : [],
      surgeryMaster: savedSurgeryMaster ? JSON.parse(savedSurgeryMaster) : {},
      orders: savedOrders ? JSON.parse(savedOrders) : [],
      fixtureData: savedFixtureData ? JSON.parse(savedFixtureData) : null,
    }));
  };

  const handleLeaveHospital = () => {
    if (!state.user) return;

    // Remove hospitalId from user object
    const updatedUser = { ...state.user, hospitalId: '', status: 'pending' as const };

    // Update local storage for users
    const storedUsersJson = localStorage.getItem('app_users');
    if (storedUsersJson) {
      const users: User[] = JSON.parse(storedUsersJson);
      const newUsers = users.map(u => u.email === updatedUser.email ? updatedUser : u);
      localStorage.setItem('app_users', JSON.stringify(newUsers));
    }

    // Update current state: Clear data view (Initialize)
    setState(prev => ({
      ...prev,
      user: updatedUser,
      inventory: [],
      surgeryMaster: {},
      orders: [],
      fixtureData: null,
      showProfile: false,
      // User is now pending with no hospitalId -> will show StaffWaitingRoom with search
    }));

    alert('초기화되었습니다. 새로운 병원을 찾아주세요.');
  };

  // 문자열 정규화 (공백 제거, 대소문자 통일, 특수기호 및 접두어 치환)
  const normalize = useCallback((str: string) => {
    return String(str || "")
      .trim()
      .toLowerCase()
      .replace(/보험임플란트/g, '')
      .replace(/수술중fail/g, '')
      .replace(/[\s\-\_\.\(\)]/g, '')
      .replace(/[Φφ]/g, 'd');
  }, []);

  const syncInventoryWithUsageAndOrders = useCallback(() => {
    setState(prev => {
      const records = prev.surgeryMaster['수술기록지'] || [];
      if (records.length === 0 && prev.inventory.length === 0) return prev;

      // Calculate global period for monthly average
      let minTime = Infinity;
      let maxTime = -Infinity;

      records.forEach(row => {
        const dateStr = row['날짜'];
        if (dateStr) {
          const t = new Date(dateStr).getTime();
          if (!isNaN(t)) {
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
          }
        }
      });

      const periodInMonths = (minTime === Infinity || maxTime === -Infinity || minTime === maxTime)
        ? 1
        : Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * 30.44));

      const updatedInventory = prev.inventory.map(item => {
        let totalUsage = 0;
        const dailyUsage: Record<string, number> = {};

        const targetM = normalize(item.manufacturer);
        const targetB = normalize(item.brand);
        const targetS = getSizeMatchKey(item.size, item.manufacturer);

        records.forEach(row => {
          const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
          if (isTotalRow) return;

          const rowM = normalize(row['제조사']);
          const rowB = normalize(row['브랜드']);
          const rowS = getSizeMatchKey(String(row['규격(SIZE)'] || ''), String(row['제조사'] || ''));

          // 제조사 포함관계 및 브랜드/규격 정확 매칭 (사이즈는 직경+길이 키로 비교)
          const isMatch = (rowM.includes(targetM) || targetM.includes(rowM) || rowM === targetM) &&
            rowB === targetB &&
            rowS === targetS;

          if (isMatch) {
            const qtyValue = row['갯수'] !== undefined ? Number(row['갯수']) : 0;
            const validQty = isNaN(qtyValue) ? 0 : qtyValue;
            totalUsage += validQty;

            const dateKey = String(row['날짜'] || 'unknown');
            dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + validQty;
          }
        });

        const dailyMax = Object.values(dailyUsage).length > 0 ? Math.max(...Object.values(dailyUsage)) : 0;
        const monthlyAvg = Number((totalUsage / periodInMonths).toFixed(1));

        // 입고 완료된 주문 수량 합산
        let totalReceived = 0;
        prev.orders.filter(o => o.status === 'received').forEach(order => {
          if (normalize(order.manufacturer) === targetM) {
            order.items.forEach(orderItem => {
              if (normalize(orderItem.brand) === targetB && getSizeMatchKey(orderItem.size, order.manufacturer) === targetS) {
                totalReceived += Number(orderItem.quantity || 0);
              }
            });
          }
        });

        const currentStock = item.initialStock + totalReceived - totalUsage;
        const recommended = Math.max(dailyMax * 2, Math.ceil(monthlyAvg));

        return {
          ...item,
          usageCount: totalUsage,
          currentStock: currentStock,
          recommendedStock: recommended,
          monthlyAvgUsage: monthlyAvg,
          dailyMaxUsage: dailyMax
        };
      });
      return { ...prev, inventory: updatedInventory };
    });
  }, [normalize]);

  useEffect(() => {
    syncInventoryWithUsageAndOrders();
  }, [state.surgeryMaster, state.orders, state.inventory.length, syncInventoryWithUsageAndOrders]);

  const handleFileUpload = async (file: File, type: UploadType) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const parsed = await parseExcelFile(file);
      if (type === 'surgery') {
        const targetSheetName = '수술기록지';
        const newSurgeryMaster = { ...state.surgeryMaster };

        if (parsed.sheets[targetSheetName]) {
          const originalSheet = parsed.sheets[targetSheetName];
          const cleanedRows = originalSheet.rows.filter(row => {
            const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
            const contentCount = Object.values(row).filter(val => val !== null && val !== undefined && String(val).trim() !== "").length;
            return !isTotalRow && contentCount > 1;
          }).map(row => {
            const desc = String(row['수술기록'] || row['수술내용'] || row['픽스쳐'] || row['규격'] || row['품명'] || "");
            const toothStr = String(row['치아번호'] || "").trim();

            let quantity = 0;
            if (toothStr !== "") {
              quantity = toothStr.includes(',') ? toothStr.split(',').length : 1;
            } else if (desc !== "") {
              quantity = 1;
            }

            let classification = "식립";
            let manufacturer = "";
            let brand = "";
            let size = "";

            if (desc.includes('[GBR Only]')) classification = "골이식만";
            else if (desc.includes('수술중FAIL_')) classification = "수술중 FAIL";
            else if (desc.includes('보험임플란트')) classification = "청구";

            if (classification === "골이식만") {
              const mMatch = desc.match(/\[(.*?)\]/);
              manufacturer = mMatch ? mMatch[1] : "GBR Only";
              const bMatch = desc.match(/\]\s*(G.*?\))/);
              brand = bMatch ? bMatch[1] : "";
            }
            else if (desc.includes('-')) {
              const mainParts = desc.split('-').map(p => p.trim());
              let rawM = mainParts[0];
              manufacturer = rawM.replace('수술중FAIL_', '').replace('보험임플란트', '').trim();
              if (manufacturer === "" && mainParts.length > 1) {
                manufacturer = mainParts[1];
              }

              const detailsStr = mainParts.slice(1).join('-');
              const slashSegments = detailsStr.split('/').map(s => s.trim());
              const brandSizeStr = slashSegments[0] || "";
              const sizeIndicatorMatch = brandSizeStr.match(/([DdLlMm]\:|[Φφ]|(?:\s|^)[DdLlMm]\s|(?:\s|^)\d)/);

              if (sizeIndicatorMatch && sizeIndicatorMatch.index !== undefined) {
                brand = brandSizeStr.substring(0, sizeIndicatorMatch.index).trim();
                size = brandSizeStr.substring(sizeIndicatorMatch.index).trim();
              } else {
                const fallbackMatch = brandSizeStr.match(/^([a-zA-Z\s\d-]+(?:\s[IVX]+)?)/);
                brand = fallbackMatch ? fallbackMatch[1].trim() : brandSizeStr;
                if (fallbackMatch) size = brandSizeStr.substring(fallbackMatch[0].length).trim();
              }

              if (manufacturer === "" || manufacturer === "보험임플란트") {
                manufacturer = brand;
              }
            } else {
              manufacturer = desc.replace('보험임플란트', '').replace('수술중FAIL_', '').trim();
            }

            return {
              ...row,
              '구분': classification,
              '갯수': quantity,
              '제조사': manufacturer,
              '브랜드': brand,
              '규격(SIZE)': size
            };
          });

          newSurgeryMaster[targetSheetName] = [...(newSurgeryMaster[targetSheetName] || []), ...cleanedRows];
          setState(prev => ({ ...prev, isLoading: false, surgeryFileName: file.name, surgeryMaster: newSurgeryMaster, dashboardTab: 'surgery_database' }));
        } else {
          alert("'수술기록지' 시트를 찾을 수 없습니다.");
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        const initialIndices: Record<string, Set<number>> = {};
        Object.keys(parsed.sheets).forEach(name => {
          initialIndices[name] = new Set(parsed.sheets[name].rows.map((_, i) => i));
        });
        setState(prev => ({ ...prev, isLoading: false, fixtureData: parsed, fixtureFileName: file.name, selectedFixtureIndices: initialIndices, dashboardTab: 'fixture_edit' }));
      }
    } catch (error) {
      alert("엑셀 파일 처리에 실패했습니다.");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleUpdateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, status, receivedDate: status === 'received' ? new Date().toISOString() : undefined } : o)
    }));
  }, []);

  const handleAddOrder = useCallback((order: Order) => {
    setState(prev => {
      let nextSurgeryMaster = { ...prev.surgeryMaster };
      if (order.type === 'fail_exchange') {
        const sheetName = '수술기록지';
        const rows = [...(nextSurgeryMaster[sheetName] || [])];
        const totalToProcess = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const targetM = normalize(order.manufacturer);
        const failIndices = rows
          .map((row, idx) => ({ row, idx }))
          .filter(({ row }) => row['구분'] === '수술중 FAIL' && normalize(row['제조사']) === targetM)
          .sort((a, b) => String(a.row['날짜'] || '').localeCompare(String(b.row['날짜'] || '')))
          .map(item => item.idx);
        const indicesToUpdate = failIndices.slice(0, totalToProcess);
        indicesToUpdate.forEach(idx => {
          rows[idx] = { ...rows[idx], '구분': 'FAIL 교환완료' };
        });
        nextSurgeryMaster[sheetName] = rows;
      }
      return {
        ...prev,
        orders: [order, ...prev.orders],
        surgeryMaster: nextSurgeryMaster,
        dashboardTab: 'order_management'
      };
    });
  }, [normalize]);

  const handleUpdateCell = useCallback((index: number, column: string, value: any, type: 'fixture' | 'surgery', sheetName?: string) => {
    setState(prev => {
      if (type === 'surgery' && sheetName) {
        const newMasterRows = [...(prev.surgeryMaster[sheetName] || [])];
        newMasterRows[index] = { ...newMasterRows[index], [column]: value };
        return { ...prev, surgeryMaster: { ...prev.surgeryMaster, [sheetName]: newMasterRows } };
      }
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];
      const newRows = [...activeSheet.rows];
      newRows[index] = { ...newRows[index], [column]: value };
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, []);

  const handleBulkToggle = useCallback((filters: Record<string, string>, targetUnused: boolean) => {
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];
      const newRows = activeSheet.rows.map(row => {
        const matches = Object.entries(filters).every(([field, value]) => String(row[field] || '') === value);
        return matches ? { ...row, '사용안함': targetUnused } : row;
      });
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, []);

  const virtualSurgeryData = useMemo(() => {
    const masterRows = state.surgeryMaster['수술기록지'];
    if (!masterRows || masterRows.length === 0) return null;
    const sortedColumns = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정', '힐링', '다음 진료'];
    return { sheets: { '수술기록지': { name: '수술기록지', columns: sortedColumns, rows: masterRows } }, activeSheetName: '수술기록지' } as ExcelData;
  }, [state.surgeryMaster]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Only Visible in Dashboard for Non-Admin Users */}
      {state.currentView === 'dashboard' && !isAdmin && (
        <Sidebar
          activeTab={state.dashboardTab}
          onTabChange={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
          fixtureData={state.fixtureData}
          surgeryData={state.surgeryData}
          isAdmin={isAdmin}
          isMaster={state.user?.role === 'master' || isAdmin}
        />
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onHomeClick={() => setState(p => ({ ...p, currentView: 'landing' }))}
          onLoginClick={() => setState(p => ({ ...p, currentView: 'login' }))}
          onSignupClick={() => setState(p => ({ ...p, currentView: 'signup' }))}
          onLogout={() => setState(prev => ({ ...prev, user: null, currentView: 'landing' }))}
          onNavigate={(v) => setState(p => ({ ...p, currentView: v }))}
          onTabNavigate={(t) => setState(p => ({ ...p, currentView: 'dashboard', dashboardTab: t }))}
          onProfileClick={() => setState(prev => ({ ...prev, showProfile: true }))}
          user={state.user}
          currentView={state.currentView}
          showLogo={state.currentView !== 'dashboard'}
        />

        <main className="flex-1 overflow-x-hidden">
          {state.currentView === 'dashboard' ? (
            /* System Admin View */
            isAdmin ? (
              <SystemAdminDashboard />
            ) :
              /* Dashboard routing based on Approval Status */
              state.user?.role === 'staff' && state.user?.status !== 'active' ? (
                <StaffWaitingRoom
                  currentUser={state.user}
                  onUpdateUser={(updatedUser) => setState(prev => ({ ...prev, user: updatedUser }))}
                  onLogout={() => setState(prev => ({ ...prev, user: null, currentView: 'landing' }))}
                />
              ) : (
                <div className="p-6 max-w-7xl mx-auto space-y-6">

                  {/* Dashboard Content */}
                  {state.dashboardTab === 'overview' && (
                    <DashboardOverview
                      inventory={state.inventory}
                      orders={state.orders}
                      surgeryMaster={state.surgeryMaster}
                      fixtureData={state.fixtureData}
                      onNavigate={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
                    />
                  )}
                  {state.dashboardTab === 'member_management' && state.user && (
                    <MemberManager
                      currentUser={state.user}
                      onClose={() => setState(prev => ({ ...prev, dashboardTab: 'overview' }))}
                    />
                  )}
                  {state.dashboardTab === 'fixture_upload' && isAdmin && (
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">픽스쳐 로우데이터 업로드</h2>
                      <UploadSection onFileUpload={(file) => handleFileUpload(file, 'fixture')} isLoading={state.isLoading} />
                    </div>
                  )}
                  {state.dashboardTab === 'fixture_edit' && isAdmin && state.fixtureData && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-800">픽스쳐 데이터 설정</h2>
                        <div className="flex gap-3">
                          <button onClick={() => {
                            if (!state.fixtureData) return;
                            const activeSheet = state.fixtureData.sheets[state.fixtureData.activeSheetName];
                            const newItems = activeSheet.rows.filter(row => row['사용안함'] !== true).map((row, idx) => ({
                              id: `sync_${Date.now()}_${idx}`,
                              manufacturer: String(row['제조사'] || row['Manufacturer'] || '기타'),
                              brand: String(row['브랜드'] || row['Brand'] || '기타'),
                              size: String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
                              initialStock: 10,
                              usageCount: 0,
                              currentStock: 10,
                              recommendedStock: 5
                            })).filter(ni => !state.inventory.some(inv => normalize(inv.manufacturer) === normalize(ni.manufacturer) && normalize(inv.brand) === normalize(ni.brand) && getSizeMatchKey(inv.size, inv.manufacturer) === getSizeMatchKey(ni.size, ni.manufacturer)));
                            if (newItems.length > 0) {
                              setState(prev => ({ ...prev, inventory: [...prev.inventory, ...newItems], dashboardTab: 'inventory_master' }));
                            } else {
                              alert("새로 추가할 품목이 없거나 이미 마스터에 존재합니다.");
                            }
                          }} className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:translate-y-[-1px] transition-all flex items-center gap-2">재고 마스터로 목록 보내기</button>
                          <button onClick={() => downloadExcelFile(state.fixtureData!, state.selectedFixtureIndices[state.fixtureData!.activeSheetName] || new Set(), state.fixtureFileName!)} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2">가공된 파일 다운로드</button>
                        </div>
                      </div>
                      <BrandChart data={state.fixtureData.sheets[state.fixtureData.activeSheetName]} onToggleBrand={(m, b, u) => handleBulkToggle({ '제조사': m, '브랜드': b }, u)} />
                      <ExcelTable data={state.fixtureData} selectedIndices={state.selectedFixtureIndices[state.fixtureData.activeSheetName] || new Set()} onToggleSelect={() => { }} onToggleAll={() => { }} onUpdateCell={(idx, col, val) => handleUpdateCell(idx, col, val, 'fixture')} onSheetChange={(name) => setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: name } }))} onBulkToggleManufacturer={(m, u) => handleBulkToggle({ '제조사': m }, u)} />
                    </div>
                  )}
                  {state.dashboardTab === 'inventory_master' && (
                    <InventoryManager
                      inventory={state.inventory}
                      onUpdateStock={(id, val) => setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === id ? { ...i, initialStock: val, currentStock: val - i.usageCount } : i) }))}
                      onDeleteInventoryItem={(id) => setState(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== id) }))}
                      onAddInventoryItem={(ni) => setState(prev => ({ ...prev, inventory: [...prev.inventory, ni] }))}
                      onUpdateInventoryItem={(ui) => setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === ui.id ? ui : i) }))}
                      surgeryData={virtualSurgeryData}
                      onQuickOrder={(item) => handleAddOrder({ id: `order_${Date.now()}`, type: 'replenishment', manufacturer: item.manufacturer, date: new Date().toISOString().split('T')[0], items: [{ brand: item.brand, size: item.size, quantity: Math.max(5, item.recommendedStock - item.currentStock) }], manager: state.user?.name || '관리자', status: 'ordered' })}
                    />
                  )}
                  {state.dashboardTab === 'surgery_database' && (
                    <div className="space-y-6 pb-20">
                      <h2 className="text-2xl font-bold text-slate-800">누적 수술기록 데이터베이스</h2>
                      <UploadSection onFileUpload={(file) => handleFileUpload(file, 'surgery')} isLoading={state.isLoading} />
                      {state.surgeryMaster['수술기록지'] && <SurgeryStats rows={state.surgeryMaster['수술기록지']} />}
                      {virtualSurgeryData && <ExcelTable data={virtualSurgeryData} selectedIndices={new Set()} onToggleSelect={() => { }} onToggleAll={() => { }} onUpdateCell={(idx, col, val) => handleUpdateCell(idx, col, val, 'surgery', '수술기록지')} onSheetChange={() => { }} hideStatusFilters={true} />}
                    </div>
                  )}
                  {state.dashboardTab === 'fail_management' && (
                    <FailManager
                      surgeryMaster={state.surgeryMaster}
                      inventory={state.inventory}
                      failOrders={state.orders.filter(o => o.type === 'fail_exchange')}
                      onAddFailOrder={handleAddOrder}
                      currentUserName={state.user?.name || '관리자'}
                    />
                  )}
                  {state.dashboardTab === 'order_management' && (
                    <OrderManager
                      orders={state.orders}
                      inventory={state.inventory}
                      onUpdateOrderStatus={handleUpdateOrderStatus}
                      onDeleteOrder={(id) => setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }))}
                      onQuickOrder={(item) => handleAddOrder({ id: `order_${Date.now()}`, type: 'replenishment', manufacturer: item.manufacturer, date: new Date().toISOString().split('T')[0], items: [{ brand: item.brand, size: item.size, quantity: Math.max(5, item.recommendedStock - item.currentStock) }], manager: state.user?.name || '관리자', status: 'ordered' })}
                    />
                  )}
                </div>
              )
          ) : (
            /* Non-Dashboard Views (Landing, Login, etc.) */
            <div className="h-full flex flex-col">
              {state.currentView === 'landing' && <LandingPage onGetStarted={() => setState(p => ({ ...p, currentView: 'login' }))} />}
              {state.currentView === 'login' && <AuthForm type="login" onSuccess={handleLoginSuccess} onSwitch={() => setState(p => ({ ...p, currentView: 'signup' }))} />}
              {state.currentView === 'signup' && <AuthForm type="signup" onSuccess={handleLoginSuccess} onSwitch={() => setState(p => ({ ...p, currentView: 'login' }))} />}
              {state.currentView === 'admin_panel' && <AdminPanel />}
              {state.currentView === 'pricing' && (
                <PricingPage onGetStarted={() => setState(p => ({ ...p, currentView: 'signup' }))} />
              )}
              {state.currentView === 'contact' && (
                <ContactPage onGetStarted={() => setState(p => ({ ...p, currentView: 'signup' }))} />
              )}
            </div>
          )}
        </main>
      </div >

      {state.showProfile && state.user && (
        <UserProfile
          user={state.user}
          onClose={() => setState(prev => ({ ...prev, showProfile: false }))}
          onLeaveHospital={handleLeaveHospital}
        />
      )}
    </div >
  );
};

export default App;
